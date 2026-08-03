using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Communication.Application.Commands.AskExpert;
using Agriculture.Modules.Communication.Application.Commands.SendMessage;
using Agriculture.Modules.Communication.Application.Commands.StartStaffConversation;
using Agriculture.Modules.Communication.Application.Queries.GetConversationMessages;
using Agriculture.Modules.Communication.Application.Queries.GetConversations;
using Agriculture.Modules.Communication.Application.Queries.GetStaffConversations;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Tasks.Domain.Entities;
using MediatR;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.EntityFrameworkCore;
using Agriculture.Application.Abstractions.Caching;

internal static class CommunicationEndpoints
{
    public static RouteGroupBuilder MapCommunicationEndpoints(this RouteGroupBuilder api)
    {
        // Conversations — staff panel = Admin↔Uzman only; producer chat lives on land hub (SDS-R16)
        var conversations = api.MapGroup("/conversations").WithTags("Communication").RequireAuthorization();
        conversations.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            // Staff Mesajlar panel: Staff-type threads only (never producer land chat)
            if (user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer))
            {
                var staffResult = user.Roles.Contains(AppRoles.Administrator)
                    ? await sender.Send(new GetStaffConversationsQuery())
                    : await sender.Send(new GetStaffConversationsQuery(user.UserId));

                if (!staffResult.IsSuccess)
                    return ApiResults.From(staffResult);

                var staffOnly = staffResult.Value
                    .Where(c => c.Type == ConversationType.Staff)
                    .ToList();
                return Results.Ok(staffOnly);
            }

            // Producer mobile: expert threads
            var producerThreads = await sender.Send(new GetConversationsQuery(user.UserId.Value));
            return ApiResults.From(producerThreads);
        });
        // Field chat (üretici↔uzman): Officer sees assigned expert threads; Producer sees own.
        // Does NOT replace staff Mesajlar panel (/conversations).
        conversations.MapGet("/expert", async (IUserContext user, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            List<Conversation> items;
            if (user.Roles.Contains(AppRoles.Producer)
                && !user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator))
            {
                items = await db.Conversations.AsNoTracking()
                    .Include(c => c.Messages)
                    .Where(c => !c.IsDeleted
                        && c.Type == ConversationType.Expert
                        && c.ProducerUserId == user.UserId)
                    .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
                    .ToListAsync();
            }
            else if (user.Roles.Contains(AppRoles.Officer) || user.Roles.Contains(AppRoles.Administrator))
            {
                var q = db.Conversations.AsNoTracking()
                    .Include(c => c.Messages)
                    .Where(c => !c.IsDeleted && c.Type == ConversationType.Expert);

                if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
                    q = q.Where(c => c.OfficerUserId == user.UserId);

                items = await q
                    .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
                    .ToListAsync();
            }
            else
            {
                return Results.Forbid();
            }

            var landIds = items.Where(c => c.LandId != null).Select(c => c.LandId!.Value).Distinct().ToList();
            var landNames = landIds.Count == 0
                ? new Dictionary<Guid, string>()
                : await db.Lands.AsNoTracking()
                    .Where(l => landIds.Contains(l.Id))
                    .ToDictionaryAsync(l => l.Id, l => l.Name);

            return Results.Ok(items.Select(c =>
            {
                var last = c.Messages.OrderByDescending(m => m.SentAtUtc).FirstOrDefault();
                var hasUnread = last is not null && last.SenderUserId != user.UserId;
                return new
                {
                    c.Id,
                    c.Subject,
                    LastMessagePreview = last?.Body,
                    LastMessageAtUtc = c.LastMessageAtUtc ?? last?.SentAtUtc,
                    Status = (int)c.Status,
                    Type = (int)c.Type,
                    c.LandId,
                    LandName = c.LandId is Guid lid ? landNames.GetValueOrDefault(lid) : null,
                    c.OfficerUserId,
                    c.AdminUserId,
                    HasUnread = hasUnread
                };
            }));
        });
        conversations.MapPost("/ask-expert", async (
            IUserContext user,
            [FromBody] AskExpertRequest? body,
            ISender sender,
            AgricultureDbContext db,
            ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            if (!user.Roles.Contains(AppRoles.Producer)
                || user.Roles.Contains(AppRoles.Officer)
                || user.Roles.Contains(AppRoles.Administrator))
                return Results.Forbid();

            Guid? landId = body?.LandId;
            Guid? officerUserId = null;

            if (landId.HasValue)
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == landId.Value);
                officerUserId = land?.AssignedOfficerUserId;
            }
            else
            {
                // Resolve from producer → land assignment when land not specified
                var producer = await db.Producers.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == user.UserId.Value);
                if (producer is not null)
                {
                    var landsWithOfficer = await db.Lands.AsNoTracking()
                        .Where(l => l.ProducerId == producer.Id && l.AssignedOfficerUserId != null)
                        .ToListAsync();
                    var openLandIds = await db.Tasks.AsNoTracking()
                        .Where(t => t.ProducerId == producer.Id
                            && (t.Status == ProductionTaskStatus.Pending
                                || t.Status == ProductionTaskStatus.InProgress
                                || t.Status == ProductionTaskStatus.Overdue
                                || t.Status == ProductionTaskStatus.AwaitingApproval))
                        .Select(t => t.LandId)
                        .Distinct()
                        .ToListAsync();
                    var assignedLand = landsWithOfficer
                        .OrderByDescending(l => openLandIds.Contains(l.Id))
                        .ThenBy(l => l.Name)
                        .FirstOrDefault();
                    if (assignedLand is not null)
                    {
                        landId = assignedLand.Id;
                        officerUserId = assignedLand.AssignedOfficerUserId;
                    }
                }
            }

            officerUserId ??= DatabaseInitializer.DemoOfficerUserId;

            var askResult = await sender.Send(new AskExpertCommand(
                user.UserId.Value,
                body?.Subject,
                officerUserId,
                landId));
            if (askResult.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(askResult);
        });
        conversations.MapPost("/staff", async (
            IUserContext user,
            [FromBody] StartStaffConversationRequest? body,
            ISender sender,
            UserManager<ApplicationUser> userManager,
            ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            Guid adminUserId;
            Guid officerUserId;

            if (user.Roles.Contains(AppRoles.Administrator))
            {
                adminUserId = user.UserId.Value;
                if (body?.OfficerUserId is null)
                    return Results.BadRequest(new { Code = "Staff.OfficerRequired", Message = "Uzman seçilmelidir." });
                officerUserId = body.OfficerUserId.Value;
            }
            else if (user.Roles.Contains(AppRoles.Officer))
            {
                officerUserId = user.UserId.Value;
                if (body?.AdminUserId is not null)
                {
                    adminUserId = body.AdminUserId.Value;
                }
                else
                {
                    var admins = await userManager.GetUsersInRoleAsync(AppRoles.Administrator);
                    var admin = admins.FirstOrDefault();
                    if (admin is null)
                        return Results.BadRequest(new { Code = "Staff.AdminMissing", Message = "Yönetici hesabı bulunamadı." });
                    adminUserId = admin.Id;
                }
            }
            else
            {
                return Results.Forbid();
            }

            var staffResult = await sender.Send(new StartStaffConversationCommand(
                adminUserId,
                officerUserId,
                body?.Subject));
            if (staffResult.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(staffResult);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        conversations.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            // Only Administrator bypasses participant check (can open any thread).
            // Officers must be participants (assigned officer / staff party).
            var staffAccess = user.Roles.Contains(AppRoles.Administrator);
            return ApiResults.From(await sender.Send(new GetConversationMessagesQuery(id, user.UserId.Value, staffAccess)));
        });
        conversations.MapPost("/{id:guid}/messages", async (
            Guid id,
            IUserContext user,
            [FromBody] SendMessageRequest body,
            ISender sender,
            ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            var staffAccess = user.Roles.Contains(AppRoles.Administrator);
            var result = await sender.Send(new SendMessageCommand(id, user.UserId.Value, body.Body, staffAccess));
            if (result.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(result);
        });

        return api;
    }
}

internal sealed record AskExpertRequest(string? Subject, Guid? LandId = null);
internal sealed record StartStaffConversationRequest(Guid? OfficerUserId, Guid? AdminUserId, string? Subject);
internal sealed record SendMessageRequest(string Body);
