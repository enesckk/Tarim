using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Inspections.Application.Commands.CompleteInspection;
using Agriculture.Modules.Inspections.Application.Commands.CreateInspection;
using Agriculture.Modules.Inspections.Application.Queries.GetInspections;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using MediatR;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.AspNetCore.Mvc;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.EntityFrameworkCore;
using Agriculture.Application.Abstractions.Caching;

internal static class InspectionsEndpoints
{
    public static RouteGroupBuilder MapInspectionsEndpoints(this RouteGroupBuilder api)
    {
        // Inspections — Officer may create/list for assigned lands (SDS-R16)
        var inspections = api.MapGroup("/inspections").WithTags("Inspections").RequireAuthorization();
        inspections.MapGet("/", async (
            [FromQuery] Guid? inspectorUserId,
            [FromQuery] Guid? landId,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var result = await sender.Send(new GetInspectionsQuery(inspectorUserId));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            var items = result.Value.AsEnumerable();
            if (landId.HasValue)
                items = items.Where(i => i.LandId == landId.Value);

            // Admin: all inspections (optional landId / inspectorUserId filters above).
            if (user.Roles.Contains(AppRoles.Administrator))
                return Results.Ok(items.ToList());

            // Officer: assigned lands (or inspections they own as inspector).
            if (user.Roles.Contains(AppRoles.Officer))
            {
                var officerLandIds = await db.Lands.AsNoTracking()
                    .Where(l => l.AssignedOfficerUserId == user.UserId)
                    .Select(l => l.Id)
                    .ToListAsync();
                items = items.Where(i =>
                    officerLandIds.Contains(i.LandId) || i.InspectorUserId == user.UserId);
                return Results.Ok(items.ToList());
            }

            // Producer: only inspections on lands they own.
            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId);
            if (producer is null)
                return Results.Ok(Array.Empty<object>());

            var producerLandIds = await db.Lands.AsNoTracking()
                .Where(l => l.ProducerId == producer.Id)
                .Select(l => l.Id)
                .ToListAsync();
            items = items.Where(i => producerLandIds.Contains(i.LandId));
            return Results.Ok(items.ToList());
        });
        inspections.MapPost("/", async (
            CreateInspectionCommand command,
            IUserContext user,
            AgricultureDbContext db,
            ISender sender,
            ICacheService cache) =>
        {
            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator) && user.UserId is not null)
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == command.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }
            var result = await sender.Send(command);
            if (!result.IsSuccess)
                return ApiResults.From(result);

            // Notify assigned inspector (tarım uzmanı) when admin (or anyone) schedules an inspection.
            if (command.InspectorUserId != Guid.Empty
                && (user.UserId is null || command.InspectorUserId != user.UserId))
            {
                var landName = await db.Lands.AsNoTracking()
                    .Where(l => l.Id == command.LandId)
                    .Select(l => l.Name)
                    .FirstOrDefaultAsync();
                await db.Notifications.AddAsync(Notification.Create(
                    command.InspectorUserId,
                    "Yeni denetim atandı",
                    $"“{command.Title}” — {landName ?? "Arazi"} · {command.ScheduledDate:dd.MM.yyyy}",
                    relatedEntityType: "Inspection",
                    relatedEntityId: result.Value));
                await db.SaveChangesAsync();
            }

            await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        inspections.MapPost("/{id:guid}/complete", async (
            Guid id,
            CompleteInspectionRequest body,
            IUserContext user,
            AgricultureDbContext db,
            ISender sender,
            ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var inspection = await db.Inspections.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
            if (inspection is null)
                return Results.NotFound(new { Code = "Inspection.NotFound", Message = "Denetim bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == inspection.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }
            else if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
            {
                return Results.Forbid();
            }

            var result = await sender.Send(new CompleteInspectionCommand(id, body.Result, body.Report));
            if (result.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        return api;
    }
}

internal sealed record CompleteInspectionRequest(InspectionResult Result, string Report);
