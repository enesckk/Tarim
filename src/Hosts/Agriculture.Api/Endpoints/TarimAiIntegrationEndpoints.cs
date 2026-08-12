using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

internal static class TarimAiIntegrationEndpoints
{
    public static RouteGroupBuilder MapTarimAiIntegrationEndpoints(
        this RouteGroupBuilder api,
        IConfiguration configuration)
    {
        var group = api.MapGroup("/integrations/tarim-ai")
            .WithTags("TarimAiIntegration")
            .AllowAnonymous();

        group.MapGet("/lands", async (
            HttpRequest request,
            AgricultureDbContext db) =>
        {
            if (!IsAuthorized(request, configuration))
                return Results.Unauthorized();

            var lands = await db.Set<Land>()
                .AsNoTracking()
                .Where(l => l.IsActive && !l.IsDeleted)
                .OrderBy(l => l.Name)
                .Select(l => new
                {
                    l.Id,
                    l.Name,
                    City = l.City,
                    District = l.District,
                    Neighborhood = l.Neighborhood,
                    CadastralBlock = l.CadastralBlock,
                    ParcelNumber = l.ParcelNumber,
                    l.AssignedOfficerUserId,
                    l.ProducerId,
                })
                .ToListAsync();

            return Results.Ok(new { items = lands, count = lands.Count });
        });

        group.MapPost("/analysis-completed", async (
            HttpRequest request,
            AnalysisCompletedRequest body,
            AgricultureDbContext db,
            UserManager<ApplicationUser> userManager,
            ILoggerFactory loggerFactory) =>
        {
            if (!IsAuthorized(request, configuration))
                return Results.Unauthorized();

            if (body.LandId == Guid.Empty || string.IsNullOrWhiteSpace(body.AnalysisId))
                return Results.BadRequest(new { Code = "Validation", Message = "landId ve analysisId gerekli." });

            var land = await db.Set<Land>()
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == body.LandId && !l.IsDeleted);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            var landName = string.IsNullOrWhiteSpace(body.LandName) ? land.Name : body.LandName.Trim();
            var completedLabel = string.IsNullOrWhiteSpace(body.CompletedAt)
                ? DateTime.UtcNow.ToString("dd.MM.yyyy HH:mm")
                : DateTime.TryParse(body.CompletedAt, out var parsed)
                    ? parsed.ToLocalTime().ToString("dd.MM.yyyy HH:mm")
                    : body.CompletedAt;
            var scorePart = body.LandUsabilityScore is int score ? $" Skor: {score}." : string.Empty;
            var classPart = string.IsNullOrWhiteSpace(body.LandUsabilityClassification)
                ? string.Empty
                : $" Kullanılabilirlik: {body.LandUsabilityClassification.Replace('_', ' ')}.";
            var title = $"{landName} — haftalık arazi analizi";
            var message =
                $"{landName} için yeni arazi analizi tamamlandı ({completedLabel}).{scorePart}{classPart}";

            var recipientIds = new HashSet<Guid>();
            var admins = await userManager.GetUsersInRoleAsync(AppRoles.Administrator);
            foreach (var admin in admins)
                recipientIds.Add(admin.Id);

            if (land.AssignedOfficerUserId is Guid officerId)
                recipientIds.Add(officerId);

            foreach (var userId in recipientIds)
            {
                var exists = await db.Notifications.AnyAsync(n =>
                    n.UserId == userId
                    && !n.IsDeleted
                    && !n.IsRead
                    && n.RelatedEntityType == "LandAnalysis"
                    && n.RelatedEntityId == body.LandId
                    && n.Body == message);
                if (exists) continue;

                await db.Notifications.AddAsync(Notification.Create(
                    userId,
                    title,
                    message,
                    NotificationChannel.InApp,
                    "LandAnalysis",
                    body.LandId));
            }

            await db.SaveChangesAsync();

            var logger = loggerFactory.CreateLogger("TarimAiIntegration");
            logger.LogInformation(
                "Tarım AI analysis notification stored for land {LandId} analysis {AnalysisId} recipients {Count}",
                body.LandId,
                body.AnalysisId,
                recipientIds.Count);

            return Results.Ok(new { notified = recipientIds.Count });
        });

        return group;
    }

    private static bool IsAuthorized(HttpRequest request, IConfiguration configuration)
    {
        var expected = configuration["TarimAi:IntegrationApiKey"];
        if (string.IsNullOrWhiteSpace(expected))
            return false;
        if (!request.Headers.TryGetValue("X-TarimAi-Key", out var provided))
            return false;
        var expectedHash = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        var providedHash = SHA256.HashData(Encoding.UTF8.GetBytes(provided.ToString()));
        return CryptographicOperations.FixedTimeEquals(expectedHash, providedHash);
    }

    private sealed record AnalysisCompletedRequest(
        Guid LandId,
        string AnalysisId,
        string? LandName,
        string? CompletedAt,
        int? LandUsabilityScore,
        string? LandUsabilityClassification);
}
