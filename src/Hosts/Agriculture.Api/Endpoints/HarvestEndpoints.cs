using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Harvest.Application.Commands.RecordHarvest;
using Agriculture.Modules.Harvest.Application.Queries.GetHarvests;
using Agriculture.Modules.Harvest.Domain.Entities;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

internal static class HarvestEndpoints
{
    public static RouteGroupBuilder MapHarvestEndpoints(this RouteGroupBuilder api)
    {
        // Harvest (+ Delivery owned by Harvest module — SDS-R01)
        var harvest = api.MapGroup("/harvest").WithTags("Harvest").RequireAuthorization();
        harvest.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            var result = await sender.Send(new GetHarvestsQuery());
            if (!result.IsSuccess)
                return ApiResults.From(result);

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator) && user.UserId is not null)
            {
                var landIds = await db.Lands.AsNoTracking()
                    .Where(l => l.AssignedOfficerUserId == user.UserId)
                    .Select(l => l.Id)
                    .ToListAsync();
                // Officers see field harvest volume only — no commercial price / buyer.
                return Results.Ok(result.Value
                    .Where(h => landIds.Contains(h.LandId))
                    .Select(h => h with { BuyerName = null, UnitPrice = null, TotalAmount = null })
                    .ToList());
            }

            return ApiResults.From(result);
        });
        harvest.MapPost("/", async (
            RecordHarvestCommand command,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db,
            IMemoryCache cache) =>
        {
            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator) && user.UserId is not null)
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == command.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();

                // Officers cannot set price / buyer fields.
                command = command with { BuyerName = null, UnitPrice = null, TotalAmount = null };
            }

            var result = await sender.Send(command);
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        harvest.MapGet("/deliveries", async (IUserContext user, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            IQueryable<DeliveryRecord> q = db.DeliveryRecords.AsNoTracking();
            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var landIds = db.Lands.AsNoTracking()
                    .Where(l => l.AssignedOfficerUserId == user.UserId)
                    .Select(l => l.Id);
                var harvestIds = db.HarvestRecords.AsNoTracking()
                    .Where(h => landIds.Contains(h.LandId))
                    .Select(h => h.Id);
                q = q.Where(d => harvestIds.Contains(d.HarvestRecordId));
            }

            var items = await q
                .OrderByDescending(d => d.DeliveryDate)
                .Select(d => new
                {
                    d.Id,
                    d.HarvestRecordId,
                    d.ProducerId,
                    d.Quantity,
                    d.Unit,
                    d.DeliveryDate,
                    d.Destination,
                    d.Notes
                })
                .ToListAsync();
            return Results.Ok(items);
        });
        harvest.MapPost("/deliveries", async (
            RecordDeliveryRequest body,
            IUserContext user,
            AgricultureDbContext db,
            IMemoryCache cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var harvestRecord = await db.HarvestRecords.FirstOrDefaultAsync(h => h.Id == body.HarvestRecordId);
            if (harvestRecord is null)
                return Results.BadRequest(new { Code = "Delivery.HarvestNotFound", Message = "Hasat kaydı bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == harvestRecord.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            var delivered = await db.DeliveryRecords
                .Where(d => d.HarvestRecordId == body.HarvestRecordId)
                .SumAsync(d => (decimal?)d.Quantity) ?? 0m;
            var remaining = harvestRecord.Quantity - delivered;
            if (body.Quantity <= 0 || body.Quantity > remaining)
                return Results.BadRequest(new { Code = "Delivery.QuantityInvalid", Message = $"Teslimat miktarı 0 ile {remaining} arasında olmalıdır." });

            var delivery = DeliveryRecord.Create(
                body.HarvestRecordId,
                harvestRecord.ProducerId,
                body.Quantity,
                body.DeliveryDate,
                string.IsNullOrWhiteSpace(body.Unit) ? harvestRecord.Unit : body.Unit!,
                body.Destination,
                body.Notes);
            await db.DeliveryRecords.AddAsync(delivery);
            await db.SaveChangesAsync();
            DashboardCache.Invalidate(cache);
            return Results.Ok(delivery.Id);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        return api;
    }
}

internal sealed record RecordDeliveryRequest(
    Guid HarvestRecordId,
    decimal Quantity,
    DateOnly DeliveryDate,
    string? Unit,
    string? Destination,
    string? Notes);
