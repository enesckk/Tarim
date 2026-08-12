using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Identity.Infrastructure.Persistence;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Agriculture.Application.Abstractions.Caching;

internal static class DashboardEndpoints
{
    public static RouteGroupBuilder MapDashboardEndpoints(this RouteGroupBuilder api)
    {
        // Operations Center summary (IMemoryCache hot path — SDS-R11)
        api.MapGet("/dashboard", async (
            IUserContext user,
            AgricultureDbContext db,
            ICacheService cache,
            UserManager<ApplicationUser> userManager) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            // Ops summary is staff-only — producers must not see municipality-wide data.
            if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
                return Results.Forbid();

            var generation = await DashboardCache.GetGenerationAsync(cache);
            var cacheKey = $"{DashboardCache.SummaryKey}:v{generation}:map1:{user.UserId}";
            var cached = await cache.GetAsync<object>(cacheKey);
            if (cached is not null)
                return Results.Ok(cached);

            // Sync overdue alerts only on cache miss (avoids stale unread while serving hit).
            await LandAlertNotifications.SyncAllOverdueAsync(db, userManager);

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var isOfficerOnly = user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator);

            IQueryable<ProductionTask> scopedTasks = db.Tasks.AsNoTracking();
            IQueryable<Inspection> scopedInspections = db.Inspections.AsNoTracking();
            IQueryable<Land> scopedLands = db.Lands.AsNoTracking();
            if (isOfficerOnly)
            {
                var officerLandIds = db.Lands.AsNoTracking()
                    .Where(l => l.AssignedOfficerUserId == user.UserId)
                    .Select(l => l.Id);
                scopedTasks = scopedTasks.Where(t => officerLandIds.Contains(t.LandId));
                scopedInspections = scopedInspections.Where(i => officerLandIds.Contains(i.LandId));
                scopedLands = scopedLands.Where(l => l.AssignedOfficerUserId == user.UserId);
            }

            IQueryable<ProductionTask> overdueQuery = scopedTasks.Where(t =>
                t.Status == ProductionTaskStatus.Overdue
                || (t.DueDate < today
                    && (t.Status == ProductionTaskStatus.Pending || t.Status == ProductionTaskStatus.InProgress)));

            var overdueCount = await overdueQuery.CountAsync();
            var overdueTasks = await overdueQuery
                .OrderBy(t => t.DueDate)
                .Select(t => new { t.Id, t.Title, t.ProducerId, t.LandId, t.DueDate, Status = (int)t.Status })
                .ToListAsync();

            var overdueLandIds = overdueTasks.Select(t => t.LandId).Distinct().ToList();
            var landLookup = await db.Lands.AsNoTracking()
                .Where(l => overdueLandIds.Contains(l.Id))
                .ToDictionaryAsync(l => l.Id, l => new { l.Name, l.ParcelNumber });

            var landAlerts = overdueTasks.Select(t =>
            {
                landLookup.TryGetValue(t.LandId, out var land);
                var landLabel = land is null ? "Arazi" : land.Name;
                var polishedTitle = LandAlertCopy.PolishTaskTitle(t.Title);
                return new
                {
                    t.Id,
                    Title = polishedTitle,
                    t.LandId,
                    LandName = land?.Name,
                    ParcelNumber = land?.ParcelNumber,
                    t.DueDate,
                    t.Status,
                    Message = LandAlertCopy.FormatMessage(landLabel, polishedTitle)
                };
            }).ToList();

            var tasksDueToday = await scopedTasks
                .Where(t => t.DueDate == today
                    && (t.Status == ProductionTaskStatus.Pending
                        || t.Status == ProductionTaskStatus.InProgress
                        || t.Status == ProductionTaskStatus.Overdue))
                .OrderBy(t => t.Title)
                .Take(8)
                .Select(t => new { t.Id, t.Title, t.ProducerId, t.LandId, t.DueDate, Status = (int)t.Status })
                .ToListAsync();

            var pendingInspectionQuery = scopedInspections
                .Where(i => i.Status == InspectionStatus.Scheduled || i.Status == InspectionStatus.InProgress);
            var openInspectionCount = await pendingInspectionQuery.CountAsync();
            var pendingInspections = await pendingInspectionQuery
                .OrderBy(i => i.ScheduledDate)
                .Take(8)
                .Select(i => new
                {
                    i.Id,
                    i.Title,
                    i.ProducerId,
                    i.LandId,
                    i.ScheduledDate,
                    Status = (int)i.Status
                })
                .ToListAsync();

            var harvestQuery = db.HarvestRecords.AsNoTracking().AsQueryable();
            if (isOfficerOnly)
                harvestQuery = harvestQuery.Where(h => scopedLands.Select(l => l.Id).Contains(h.LandId));

            var harvests = await harvestQuery
                .OrderByDescending(h => h.HarvestDate)
                .Take(12)
                .ToListAsync();
            var harvestIds = harvests.Select(h => h.Id).ToList();
            var deliverySums = await db.DeliveryRecords.AsNoTracking()
                .Where(d => harvestIds.Contains(d.HarvestRecordId))
                .GroupBy(d => d.HarvestRecordId)
                .Select(g => new { HarvestRecordId = g.Key, Delivered = g.Sum(x => x.Quantity) })
                .ToListAsync();
            var deliveredMap = deliverySums.ToDictionary(x => x.HarvestRecordId, x => x.Delivered);
            var harvestPipeline = harvests.Select(h =>
            {
                deliveredMap.TryGetValue(h.Id, out var delivered);
                return new
                {
                    h.Id,
                    h.ProductName,
                    h.ProducerId,
                    h.Quantity,
                    h.Unit,
                    h.HarvestDate,
                    DeliveredQuantity = delivered,
                    RemainingQuantity = h.Quantity - delivered
                };
            }).ToList();

            var unreadNotifications = await db.Notifications.AsNoTracking()
                .CountAsync(n => n.UserId == user.UserId.Value && !n.IsRead);
            var openConversations = isOfficerOnly
                ? await db.Conversations.AsNoTracking()
                    .CountAsync(c => c.Status == ConversationStatus.Open && c.OfficerUserId == user.UserId)
                : await db.Conversations.AsNoTracking()
                    .CountAsync(c => c.Status == ConversationStatus.Open);

            var activeWorkflows = await db.ProductionWorkflows.AsNoTracking()
                .CountAsync(pw => (pw.Status == ProductionWorkflowStatus.InProgress
                    || pw.Status == ProductionWorkflowStatus.NotStarted)
                    && (!isOfficerOnly || scopedLands.Select(l => l.Id).Contains(pw.LandId)));

            var recentActivity = new List<(DateTime At, string Kind, string Title, Guid RefId)>();

            var completedTasks = await scopedTasks
                .Where(t => t.CompletedAtUtc != null)
                .OrderByDescending(t => t.CompletedAtUtc)
                .Take(5)
                .Select(t => new { At = t.CompletedAtUtc!.Value, t.Title, RefId = t.Id })
                .ToListAsync();
            recentActivity.AddRange(completedTasks.Select(t => (t.At, "task", t.Title, t.RefId)));

            var inspectionRows = await scopedInspections
                .OrderByDescending(i => i.UpdatedAtUtc ?? i.CreatedAtUtc)
                .Take(5)
                .Select(i => new { At = i.UpdatedAtUtc ?? i.CreatedAtUtc, i.Title, RefId = i.Id })
                .ToListAsync();
            recentActivity.AddRange(inspectionRows.Select(i => (i.At, "inspection", i.Title, i.RefId)));

            var harvestRowsQuery = db.HarvestRecords.AsNoTracking().AsQueryable();
            if (isOfficerOnly)
                harvestRowsQuery = harvestRowsQuery.Where(h => scopedLands.Select(l => l.Id).Contains(h.LandId));
            var harvestRows = await harvestRowsQuery
                .OrderByDescending(h => h.CreatedAtUtc)
                .Take(5)
                .Select(h => new { At = h.CreatedAtUtc, Title = h.ProductName, RefId = h.Id })
                .ToListAsync();
            recentActivity.AddRange(harvestRows.Select(h => (h.At, "harvest", h.Title, h.RefId)));

            IQueryable<ChatMessage> messageQuery = db.ChatMessages.AsNoTracking();
            if (isOfficerOnly)
            {
                var officerConvoIds = db.Conversations.AsNoTracking()
                    .Where(c => c.OfficerUserId == user.UserId || c.AdminUserId == user.UserId)
                    .Select(c => c.Id);
                messageQuery = messageQuery.Where(m => officerConvoIds.Contains(m.ConversationId));
            }
            var messageRows = await messageQuery
                .OrderByDescending(m => m.SentAtUtc)
                .Take(5)
                .Select(m => new { m.SentAtUtc, m.Body, m.ConversationId })
                .ToListAsync();
            recentActivity.AddRange(messageRows.Select(m => (
                m.SentAtUtc,
                "message",
                m.Body.Length > 80 ? m.Body[..80] + "…" : m.Body,
                m.ConversationId)));

            var recentActivityDto = recentActivity
                .OrderByDescending(a => a.At)
                .Take(12)
                .Select(a => new { a.At, a.Kind, a.Title, a.RefId })
                .ToList();

            var mapLandRows = await scopedLands
                .Where(l => l.IsActive && l.Latitude != null && l.Longitude != null)
                .Select(l => new
                {
                    l.Id,
                    l.Name,
                    Latitude = l.Latitude!.Value,
                    Longitude = l.Longitude!.Value,
                    l.Neighborhood,
                    l.District,
                    l.ParcelNumber
                })
                .ToListAsync();
            // Operasyon haritası: Şehitkamil odaklı (ilçe adı veya koordinat kutusu)
            mapLandRows = mapLandRows
                .Where(l =>
                    string.Equals(l.District, "Şehitkamil", StringComparison.OrdinalIgnoreCase)
                    || (l.Latitude is >= 36.99 and <= 37.17 && l.Longitude is >= 37.28 and <= 37.50))
                .ToList();
            var mapLandIds = mapLandRows.Select(l => l.Id).ToList();
            var mapStatuses = await LandMapStatus.ComputeAsync(db, mapLandIds);
            var mapLands = mapLandRows.Select(l =>
            {
                mapStatuses.TryGetValue(l.Id, out var status);
                return new
                {
                    l.Id,
                    l.Name,
                    l.Latitude,
                    l.Longitude,
                    l.Neighborhood,
                    l.District,
                    l.ParcelNumber,
                    MapStatus = status ?? LandMapStatus.Normal
                };
            }).ToList();

            var producerCount = isOfficerOnly
                ? await scopedLands
                    .Where(l => l.ProducerId != null)
                    .Select(l => l.ProducerId!.Value)
                    .Distinct()
                    .CountAsync()
                : await db.Producers.CountAsync();

            var harvestCount = isOfficerOnly
                ? await db.HarvestRecords.AsNoTracking()
                    .CountAsync(h => scopedLands.Select(l => l.Id).Contains(h.LandId))
                : await db.HarvestRecords.CountAsync();

            var summary = new
            {
                Producers = producerCount,
                Lands = await scopedLands.CountAsync(),
                ActiveSeasons = await db.Seasons.CountAsync(s => s.Status == Agriculture.Modules.Seasons.Domain.Entities.SeasonStatus.Active),
                PendingTasks = await scopedTasks.CountAsync(t => t.Status == ProductionTaskStatus.Pending
                    || t.Status == ProductionTaskStatus.InProgress),
                OverdueTasks = overdueCount,
                OpenInspections = openInspectionCount,
                HarvestRecords = harvestCount,
                ActiveProductionWorkflows = activeWorkflows,
                UnreadNotifications = unreadNotifications,
                OpenConversations = openConversations,
                TasksDueToday = tasksDueToday,
                OverdueTaskItems = overdueTasks,
                LandAlerts = landAlerts,
                PendingInspectionItems = pendingInspections,
                HarvestPipeline = harvestPipeline,
                RecentActivity = recentActivityDto,
                MapLands = mapLands
            };

            await cache.SetAsync(cacheKey, summary, TimeSpan.FromSeconds(30));
            return Results.Ok(summary);
        }).WithTags("Dashboard").RequireAuthorization();
        return api;
    }

    public static WebApplication MapHealthEndpoints(this WebApplication app)
    {
        static IResult Live() => Results.Ok(new
        {
            status = "healthy",
            service = "Agriculture.Api"
        });

        app.MapGet("/health", Live);
        app.MapGet("/health/live", Live);
        app.MapGet("/health/ready", async (
            AgricultureDbContext agricultureDb,
            IdentityDbContext identityDb,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var agricultureConnected = await agricultureDb.Database.CanConnectAsync(cancellationToken);
                var identityConnected = await identityDb.Database.CanConnectAsync(cancellationToken);
                if (!agricultureConnected || !identityConnected)
                {
                    return Results.Json(
                        new { status = "unhealthy", database = "unavailable" },
                        statusCode: StatusCodes.Status503ServiceUnavailable);
                }

                // CanConnect succeeds for an empty SQLite file; query real tables as well.
                await agricultureDb.Producers.AsNoTracking().AnyAsync(cancellationToken);
                await identityDb.Users.AsNoTracking().AnyAsync(cancellationToken);

                // Development SQLite uses CreateTables for the two contexts sharing one file.
                // Production SQL Server is migration-governed and must have no pending migration.
                var sqlite = agricultureDb.Database.ProviderName?
                    .Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true;
                var agriculturePending = !sqlite && (await agricultureDb.Database
                    .GetPendingMigrationsAsync(cancellationToken)).Any();
                var identityPending = !sqlite && (await identityDb.Database
                    .GetPendingMigrationsAsync(cancellationToken)).Any();
                if (agriculturePending || identityPending)
                {
                    return Results.Json(
                        new
                        {
                            status = "unhealthy",
                            database = "migration-required",
                            agriculturePending,
                            identityPending
                        },
                        statusCode: StatusCodes.Status503ServiceUnavailable);
                }

                var minioEnabled = configuration.GetValue("Minio:Enabled", false);
                if (minioEnabled)
                {
                    var endpoint = configuration["Minio:Endpoint"] ?? "localhost:9000";
                    var scheme = configuration.GetValue("Minio:UseSsl", false) ? "https" : "http";
                    using var minioRequest = new HttpRequestMessage(
                        HttpMethod.Get, $"{scheme}://{endpoint}/minio/health/live");
                    using var minioResponse = await httpClientFactory.CreateClient()
                        .SendAsync(minioRequest, cancellationToken);
                    if (!minioResponse.IsSuccessStatusCode)
                    {
                        return Results.Json(
                            new { status = "unhealthy", storage = "unavailable" },
                            statusCode: StatusCodes.Status503ServiceUnavailable);
                    }
                }

                return Results.Ok(new
                {
                    status = "ready",
                    database = "connected",
                    storage = minioEnabled ? "connected" : "local"
                });
            }
            catch (Exception exception)
            {
                loggerFactory.CreateLogger("Readiness")
                    .LogError(exception, "Database readiness check failed");
                return Results.Json(
                    new { status = "unhealthy", database = "check-failed" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }
        });
        return app;
    }
}
