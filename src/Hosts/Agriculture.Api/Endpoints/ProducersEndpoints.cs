using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Application.Abstractions;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Producers.Application.Commands.AddProducerNote;
using Agriculture.Modules.Producers.Application.Commands.RegisterProducer;
using Agriculture.Modules.Producers.Application.Queries.GetProducerById;
using Agriculture.Modules.Producers.Application.Queries.GetProducerNotes;
using Agriculture.Modules.Producers.Application.Queries.GetProducers;
using Agriculture.Modules.Producers.Domain.Entities;
using MediatR;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.EntityFrameworkCore;
using Agriculture.Application.Abstractions.Caching;

internal static class ProducersEndpoints
{
    public static RouteGroupBuilder MapProducersEndpoints(this RouteGroupBuilder api)
    {
        // Producers
        var producers = api.MapGroup("/producers").WithTags("Producers").RequireAuthorization();
        producers.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            // Directory with phones is staff-only (web + officer "Üretici ara").
            var isAdmin = user.Roles.Contains(AppRoles.Administrator);
            var isOfficer = user.Roles.Contains(AppRoles.Officer);
            if (!isAdmin && !isOfficer)
                return Results.Forbid();

            var result = await sender.Send(new GetProducersQuery());
            if (!result.IsSuccess)
                return ApiResults.From(result);

            if (isAdmin)
                return ApiResults.From(result);

            var linkedIds = await db.Lands.AsNoTracking()
                .Where(l => l.AssignedOfficerUserId == user.UserId && l.ProducerId != null)
                .Select(l => l.ProducerId!.Value)
                .Distinct()
                .ToListAsync();

            return Results.Ok(result.Value.Where(p => linkedIds.Contains(p.Id)).ToList());
        });
        producers.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            if (!await ProducerAccess.CanAccessAsync(user, id, db))
                return Results.Forbid();

            return ApiResults.From(await sender.Send(new GetProducerByIdQuery(id)));
        });
        producers.MapGet("/{id:guid}/notes", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            if (!await ProducerAccess.CanAccessAsync(user, id, db))
                return Results.Forbid();

            var producer = await db.Producers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (producer is null)
                return Results.NotFound(new { Code = "Producer.NotFound", Message = "Üretici bulunamadı." });

            return ApiResults.From(await sender.Send(new GetProducerNotesQuery(id)));
        });
        producers.MapPost("/{id:guid}/notes", async (
            Guid id,
            AddProducerNoteBody body,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            if (!await ProducerAccess.CanAccessAsync(user, id, db))
                return Results.Forbid();

            return ApiResults.From(await sender.Send(new AddProducerNoteCommand(id, user.UserId.Value, body.Body)));
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        producers.MapPost("/", async (
            RegisterProducerRequest body,
            IIdentityService identity,
            ISender sender,
            ICacheService cache,
            CancellationToken cancellationToken) =>
        {
            var firstName = body.FirstName?.Trim() ?? string.Empty;
            var lastName = body.LastName?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(firstName))
            {
                return Results.BadRequest(new
                {
                    code = "Producer.FirstNameRequired",
                    message = "Ad zorunludur."
                });
            }

            if (string.IsNullOrWhiteSpace(lastName))
            {
                return Results.BadRequest(new
                {
                    code = "Producer.LastNameRequired",
                    message = "Soyad zorunludur."
                });
            }

            var password = body.Password?.Trim() ?? string.Empty;
            if (password.Length < 3)
            {
                return Results.BadRequest(new
                {
                    code = "Producer.PasswordRequired",
                    message = "Uygulama şifresi gerekli (en az 3 karakter)."
                });
            }

            var phone = body.Phone?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(phone))
            {
                return Results.BadRequest(new
                {
                    code = "Producer.PhoneRequired",
                    message = "Telefon zorunludur (uygulama girişi için kullanılır)."
                });
            }

            var email = string.IsNullOrWhiteSpace(body.Email)
                ? ProducerAccountHelper.BuildLoginEmail(phone)
                : body.Email.Trim();

            var (ok, err, userId) = await identity.RegisterAsync(
                email,
                password,
                firstName,
                lastName,
                AppRoles.Producer,
                phone,
                cancellationToken: cancellationToken);
            if (!ok)
            {
                return Results.BadRequest(new
                {
                    code = "Producer.AccountFailed",
                    message = err ?? "Uygulama hesabı oluşturulamadı."
                });
            }

            var result = await sender.Send(new RegisterProducerCommand(
                firstName,
                lastName,
                body.NationalId?.Trim() ?? string.Empty,
                phone,
                string.IsNullOrWhiteSpace(body.Email) ? null : body.Email.Trim(),
                body.Address,
                userId), cancellationToken);
            if (result.IsSuccess)
            {
                await DashboardCache.InvalidateAsync(cache);
                await cache.RemoveAsync("producers:all", cancellationToken);
            }
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        return api;
    }
}

internal sealed record RegisterProducerRequest(
    string? FirstName,
    string? LastName,
    string? NationalId,
    string? Phone,
    string? Password,
    string? Email = null,
    string? Address = null);

file static class ProducerAccountHelper
{
    public static string BuildLoginEmail(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length >= 10)
            digits = digits[^10..];
        if (string.IsNullOrWhiteSpace(digits))
            digits = Guid.NewGuid().ToString("N")[..10];
        return $"{digits}@producer.local";
    }
}
internal sealed record AddProducerNoteBody(string Body);
