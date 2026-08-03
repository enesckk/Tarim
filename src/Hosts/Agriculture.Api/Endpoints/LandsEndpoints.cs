using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Communication.Application.Commands.SendMessage;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Lands.Application.Commands.AssignLandAssignments;
using Agriculture.Modules.Lands.Application.Commands.AssignLandProducer;
using Agriculture.Modules.Lands.Application.Commands.AddLandNote;
using Agriculture.Modules.Lands.Application.Commands.RegisterLand;
using Agriculture.Modules.Lands.Application.Commands.UpdateLand;
using Agriculture.Modules.Lands.Application.Queries.GetLandById;
using Agriculture.Modules.Lands.Application.Queries.GetLandNotes;
using Agriculture.Modules.Lands.Application.Queries.GetLands;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Tasks.Application;
using Agriculture.Modules.Tasks.Application.Commands.CreateTask;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Application.Queries.GetLandProductions;
using Agriculture.Modules.Workflows.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

internal static class LandsEndpoints
{
    public static RouteGroupBuilder MapLandsEndpoints(this RouteGroupBuilder api)
    {
        // Lands — hub of operations (SDS-R15 / SDS-R16)
        var lands = api.MapGroup("/lands").WithTags("Lands").RequireAuthorization();
        lands.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            Guid? officerFilter = null;
            Guid? producerFilter = null;
            var isAdmin = user.Roles.Contains(AppRoles.Administrator);
            var isOfficer = user.Roles.Contains(AppRoles.Officer);
            var isProducer = user.Roles.Contains(AppRoles.Producer);

            if (isAdmin)
            {
                // full list
            }
            else if (isOfficer)
            {
                officerFilter = user.UserId;
            }
            else if (isProducer)
            {
                var producer = await db.Producers.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == user.UserId);
                if (producer is null)
                    return Results.Ok(Array.Empty<object>());
                producerFilter = producer.Id;
            }
            else
            {
                return Results.Forbid();
            }

            var result = await sender.Send(new GetLandsQuery(officerFilter, producerFilter));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var landIds = result.Value.Select(l => l.Id).ToList();
            var alertCounts = await db.Tasks.AsNoTracking()
                .Where(t => landIds.Contains(t.LandId)
                    && t.Status != ProductionTaskStatus.Completed
                    && t.Status != ProductionTaskStatus.Cancelled
                    && t.Status != ProductionTaskStatus.AwaitingApproval
                    && (t.Status == ProductionTaskStatus.Overdue
                        || (t.DueDate != null && t.DueDate < today)))
                .GroupBy(t => t.LandId)
                .Select(g => new { LandId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.LandId, x => x.Count);

            var activeProductions = await (
                from pw in db.ProductionWorkflows.AsNoTracking()
                join w in db.Workflows.AsNoTracking() on pw.WorkflowId equals w.Id
                where landIds.Contains(pw.LandId)
                    && (pw.Status == ProductionWorkflowStatus.InProgress
                        || pw.Status == ProductionWorkflowStatus.NotStarted)
                select new { pw.LandId, w.Name, w.CropType, pw.StartedAtUtc }
            ).ToListAsync();

            var activeByLand = activeProductions
                .GroupBy(x => x.LandId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(x => x.StartedAtUtc).First());

            var mapStatuses = await LandMapStatus.ComputeAsync(db, landIds);

            var enriched = result.Value.Select(l =>
            {
                alertCounts.TryGetValue(l.Id, out var alerts);
                activeByLand.TryGetValue(l.Id, out var active);
                mapStatuses.TryGetValue(l.Id, out var mapStatus);
                return new LandDto(
                    l.Id, l.Name, l.ParcelNumber, l.SizeInDecares, l.Latitude, l.Longitude,
                    l.SoilType, l.ProducerId, l.AssignedOfficerUserId, l.IsActive,
                    alerts,
                    active?.CropType,
                    active?.Name,
                    l.Neighborhood,
                    l.CadastralBlock,
                    l.SoilNotes,
                    mapStatus ?? LandMapStatus.Normal,
                    l.City,
                    l.District);
            }).ToList();

            return Results.Ok(enriched);
        });
        lands.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var result = await sender.Send(new GetLandByIdQuery(id));
            if (!result.IsSuccess)
                return Results.NotFound(new { Code = result.Error.Code, Message = result.Error.Message });

            var land = result.Value;
            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            if (user.Roles.Contains(AppRoles.Producer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && !user.Roles.Contains(AppRoles.Officer))
            {
                var producer = await db.Producers.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == user.UserId);
                if (producer is null || land.ProducerId != producer.Id)
                    return Results.Forbid();
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var alertCount = await db.Tasks.AsNoTracking()
                .CountAsync(t => t.LandId == id
                    && t.Status != ProductionTaskStatus.Completed
                    && t.Status != ProductionTaskStatus.Cancelled
                    && t.Status != ProductionTaskStatus.AwaitingApproval
                    && (t.Status == ProductionTaskStatus.Overdue
                        || (t.DueDate != null && t.DueDate < today)));

            var active = await (
                from pw in db.ProductionWorkflows.AsNoTracking()
                join w in db.Workflows.AsNoTracking() on pw.WorkflowId equals w.Id
                where pw.LandId == id
                    && (pw.Status == ProductionWorkflowStatus.InProgress
                        || pw.Status == ProductionWorkflowStatus.NotStarted)
                orderby pw.StartedAtUtc descending
                select new
                {
                    pw.Id,
                    pw.SeasonId,
                    pw.WorkflowId,
                    WorkflowName = w.Name,
                    w.CropType,
                    Status = (int)pw.Status,
                    pw.CurrentStepOrder,
                    pw.ProducerId
                }
            ).FirstOrDefaultAsync();

            var mapStatuses = await LandMapStatus.ComputeAsync(db, [id]);
            mapStatuses.TryGetValue(id, out var mapStatus);

            return Results.Ok(new
            {
                land.Id,
                land.Name,
                land.ParcelNumber,
                land.SizeInDecares,
                land.Latitude,
                land.Longitude,
                land.SoilType,
                land.SoilNotes,
                land.City,
                land.District,
                land.Neighborhood,
                land.CadastralBlock,
                land.ProducerId,
                land.AssignedOfficerUserId,
                land.IsActive,
                AlertCount = alertCount,
                ActiveCropType = active?.CropType,
                ActiveWorkflowName = active?.WorkflowName,
                ActiveProduction = active,
                MapStatus = mapStatus ?? LandMapStatus.Normal
            });
        });
        lands.MapPost("/", async (RegisterLandCommand command, ISender sender, IMemoryCache cache) =>
        {
            var result = await sender.Send(command);
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        lands.MapPut("/{id:guid}", async (
            Guid id,
            UpdateLandBody body,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db,
            IMemoryCache cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            var result = await sender.Send(new UpdateLandCommand(
                id,
                body.Name,
                body.ParcelNumber,
                body.SizeInDecares,
                body.CadastralBlock,
                body.Neighborhood,
                body.Latitude,
                body.Longitude,
                body.SoilType,
                body.SoilNotes));
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        lands.MapPost("/{id:guid}/assign-producer", async (Guid id, AssignLandProducerBody body, ISender sender, IMemoryCache cache) =>
        {
            var result = await sender.Send(new AssignLandProducerCommand(id, body.ProducerId));
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        lands.MapPut("/{id:guid}/assignments", async (Guid id, AssignLandAssignmentsBody body, ISender sender, IMemoryCache cache) =>
        {
            var result = await sender.Send(new AssignLandAssignmentsCommand(id, body.ProducerId, body.OfficerUserId));
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        lands.MapGet("/{id:guid}/alerts", async (
            Guid id,
            IUserContext user,
            AgricultureDbContext db,
            UserManager<ApplicationUser> userManager) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var overdueRows = await db.Tasks.AsNoTracking()
                .Where(t => t.LandId == id
                    && t.Status != ProductionTaskStatus.Completed
                    && t.Status != ProductionTaskStatus.Cancelled
                    && t.Status != ProductionTaskStatus.AwaitingApproval
                    && (t.Status == ProductionTaskStatus.Overdue
                        || (t.DueDate != null && t.DueDate < today)))
                .OrderBy(t => t.DueDate)
                .Select(t => new { t.Id, t.Title, t.DueDate, Status = (int)t.Status })
                .ToListAsync();

            var alerts = overdueRows.Select(t => new
            {
                t.Id,
                Title = LandAlertCopy.PolishTaskTitle(t.Title),
                t.DueDate,
                t.Status,
                Message = LandAlertCopy.FormatMessage(land.Name, t.Title),
                LandId = land.Id,
                LandName = land.Name,
                ParcelNumber = land.ParcelNumber
            }).ToList();

            // Same alert class → Bildirimler inbox for admin + assigned uzman
            await LandAlertNotifications.SyncForLandAsync(db, userManager, land, alerts.Select(a => (a.Id, a.Title, a.Message)).ToList());

            return Results.Ok(alerts);
        });
        lands.MapGet("/{id:guid}/notes", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            return ApiResults.From(await sender.Send(new GetLandNotesQuery(id)));
        });
        lands.MapPost("/{id:guid}/notes", async (
            Guid id,
            AddLandNoteBody body,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            return ApiResults.From(await sender.Send(new AddLandNoteCommand(id, user.UserId.Value, body.Body)));
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        lands.MapGet("/{id:guid}/productions", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            return ApiResults.From(await sender.Send(new GetLandProductionsQuery(id)));
        });
        lands.MapGet("/{id:guid}/conversations", async (Guid id, IUserContext user, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            var items = await db.Conversations.AsNoTracking()
                .Include(c => c.Messages)
                .Where(c => !c.IsDeleted
                    && c.LandId == id
                    && c.Type == ConversationType.Expert)
                .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
                .ToListAsync();

            return Results.Ok(items.Select(c =>
            {
                var last = c.Messages.OrderByDescending(m => m.SentAtUtc).FirstOrDefault();
                var hasUnread = last is not null && user.UserId is Guid viewer && last.SenderUserId != viewer;
                return new
                {
                    c.Id,
                    c.Subject,
                    LastMessagePreview = last?.Body,
                    LastMessageAtUtc = c.LastMessageAtUtc ?? last?.SentAtUtc,
                    Status = (int)c.Status,
                    Type = (int)c.Type,
                    c.LandId,
                    c.OfficerUserId,
                    c.AdminUserId,
                    HasUnread = hasUnread
                };
            }));
        });
        // Land hub chat: reply on producer↔uzman thread (SDS-R16 message placement)
        lands.MapPost("/{id:guid}/conversations/{conversationId:guid}/messages", async (
            Guid id,
            Guid conversationId,
            IUserContext user,
            [FromBody] SendMessageRequest body,
            ISender sender,
            AgricultureDbContext db,
            IMemoryCache cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            var conversation = await db.Conversations.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);
            if (conversation is null
                || conversation.LandId != id
                || conversation.Type != ConversationType.Expert)
                return Results.BadRequest(new { Code = "Conversation.NotLandThread", Message = "Bu sohbet arazi üretici kanalına ait değil." });

            var staffAccess = user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer);
            var result = await sender.Send(new SendMessageCommand(
                conversationId, user.UserId.Value, body.Body, staffAccess));
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        lands.MapGet("/{id:guid}/tasks", async (Guid id, IUserContext user, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            var items = await db.Tasks.AsNoTracking()
                .Include(t => t.Photos)
                .Where(t => t.LandId == id && !t.IsDeleted)
                .OrderByDescending(t => t.Status == ProductionTaskStatus.AwaitingApproval)
                .ThenBy(t => t.DueDate)
                .ThenBy(t => t.Title)
                .ToListAsync();

            return Results.Ok(items.Select(t => new
            {
                t.Id,
                t.ProducerId,
                t.LandId,
                t.Title,
                t.Description,
                DueDate = t.DueDate,
                Status = (int)t.Status,
                t.RequiresPhoto,
                t.RequiresQuantity,
                t.RequiresDate,
                t.QuantityUnit,
                t.Theme,
                t.VideoUrl,
                t.ImageUrl,
                t.RevisionReason,
                t.CompletionNotes,
                t.PlannedEvidenceJson,
                t.EvidenceJson,
                t.CompletedAtUtc,
                PhotoCount = t.Photos.Count,
                Photos = t.Photos
                    .OrderByDescending(p => p.UploadedAtUtc)
                    .Select(p => new
                    {
                        p.Id,
                        p.StorageKey,
                        p.FileName,
                        p.ContentType,
                        p.UploadedAtUtc
                    })
                    .ToList()
            }));
        });

        lands.MapPost("/{id:guid}/tasks", async (
            Guid id,
            CreateLandTaskBody body,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db,
            IMemoryCache cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
                return Results.Forbid();

            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator)
                && land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();

            if (land.ProducerId is null)
                return Results.BadRequest(new { Code = "Land.NoProducer", Message = "Önce araziye üretici atayın." });

            if (string.IsNullOrWhiteSpace(body.Title))
                return Results.BadRequest(new { Code = "Task.TitleRequired", Message = "Görev başlığı gerekli." });

            if (string.IsNullOrWhiteSpace(body.Theme)
                || !TaskThemes.TryNormalize(body.Theme, out var theme))
            {
                return Results.BadRequest(new
                {
                    Code = "Task.ThemeRequired",
                    Message = "İşlem teması gerekli (Sulama, Gübreleme, İlaçlama, Dikim, Hasat, Bakım)."
                });
            }

            var production = await db.ProductionWorkflows.AsNoTracking()
                .Where(p => p.LandId == id
                    && (p.Status == ProductionWorkflowStatus.InProgress
                        || p.Status == ProductionWorkflowStatus.NotStarted))
                .OrderByDescending(p => p.StartedAtUtc ?? p.CreatedAtUtc)
                .FirstOrDefaultAsync();

            if (production is null)
                return Results.BadRequest(new
                {
                    Code = "Land.NoProduction",
                    Message = "Görev göndermek için önce bu arazide üretim planı başlatın."
                });

            TaskThemes.ApplyCreateDefaults(theme, out var requiresPhoto);

            var plannedCheck = TaskEvidenceHelper.ValidatePlanned(theme, body.PlannedEvidence);
            if (!plannedCheck.IsSuccess)
                return ApiResults.From(plannedCheck);

            var result = await sender.Send(new CreateTaskCommand(
                production.Id,
                land.ProducerId.Value,
                id,
                body.Title.Trim(),
                body.Description,
                null,
                body.DueDate,
                requiresPhoto,
                body.RequiresQuantity,
                false,
                body.QuantityUnit,
                Theme: theme,
                PlannedEvidence: body.PlannedEvidence));

            if (!result.IsSuccess)
                return ApiResults.From(result);

            DashboardCache.Invalidate(cache);

            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == land.ProducerId.Value);
            if (producer?.UserId is Guid producerUserId)
            {
                await db.Notifications.AddAsync(Notification.Create(
                    producerUserId,
                    "Yeni görev",
                    $"“{body.Title.Trim()}” görevi size gönderildi.",
                    relatedEntityType: "Task",
                    relatedEntityId: result.Value));
                await db.SaveChangesAsync();
            }

            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        return api;
    }
}

internal sealed record CreateLandTaskBody(
    string Title,
    string? Description = null,
    DateOnly? DueDate = null,
    string? Theme = null,
    TaskEvidenceDto? PlannedEvidence = null,
    bool RequiresPhoto = false,
    bool RequiresQuantity = false,
    string? QuantityUnit = null);
internal sealed record AssignLandProducerBody(Guid ProducerId);
internal sealed record AssignLandAssignmentsBody(Guid? ProducerId, Guid? OfficerUserId);
internal sealed record UpdateLandBody(
    string Name,
    string ParcelNumber,
    decimal SizeInDecares,
    string? CadastralBlock,
    string? Neighborhood,
    double? Latitude,
    double? Longitude,
    string? SoilType,
    string? SoilNotes);
internal sealed record AddLandNoteBody(string Body);
