using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Domain.Entities;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Marker colors for the ops land map.
/// Priority: critical &gt; today &gt; harvest &gt; normal.
/// </summary>
internal static class LandMapStatus
{
    public const string Normal = "normal";
    public const string Today = "today";
    public const string Critical = "critical";
    public const string Harvest = "harvest";

    /// <summary>
    /// critical: overdue incomplete task, OR active production with no producer
    /// task completion/update for 3+ days (production older than 3 days).
    /// today: open task due today.
    /// harvest: harvest record with undelivered remaining quantity.
    /// normal: otherwise.
    /// </summary>
    public static async Task<Dictionary<Guid, string>> ComputeAsync(
        AgricultureDbContext db,
        IReadOnlyList<Guid> landIds,
        CancellationToken cancellationToken = default)
    {
        var result = landIds.ToDictionary(id => id, _ => Normal);
        if (landIds.Count == 0)
            return result;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var staleBefore = DateTime.UtcNow.AddDays(-3);

        var overdueLandIds = await db.Tasks.AsNoTracking()
            .Where(t => landIds.Contains(t.LandId)
                && t.Status != ProductionTaskStatus.Completed
                && t.Status != ProductionTaskStatus.Cancelled
                && t.Status != ProductionTaskStatus.AwaitingApproval
                && (t.Status == ProductionTaskStatus.Overdue
                    || (t.DueDate != null && t.DueDate < today)))
            .Select(t => t.LandId)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var id in overdueLandIds)
            result[id] = Critical;

        var activeProductions = await db.ProductionWorkflows.AsNoTracking()
            .Where(pw => landIds.Contains(pw.LandId)
                && (pw.Status == ProductionWorkflowStatus.InProgress
                    || pw.Status == ProductionWorkflowStatus.NotStarted))
            .Select(pw => new { pw.LandId, pw.StartedAtUtc })
            .ToListAsync(cancellationToken);

        var oldestActiveByLand = activeProductions
            .GroupBy(x => x.LandId)
            .ToDictionary(g => g.Key, g => g.Min(x => x.StartedAtUtc ?? DateTime.MinValue));

        var lastActivityByLand = await db.Tasks.AsNoTracking()
            .Where(t => landIds.Contains(t.LandId))
            .GroupBy(t => t.LandId)
            .Select(g => new
            {
                LandId = g.Key,
                Last = g.Max(t =>
                    t.CompletedAtUtc
                    ?? t.UpdatedAtUtc
                    ?? t.CreatedAtUtc)
            })
            .ToDictionaryAsync(x => x.LandId, x => x.Last, cancellationToken);

        foreach (var (landId, startedAt) in oldestActiveByLand)
        {
            if (result[landId] == Critical)
                continue;
            if (startedAt >= staleBefore)
                continue;

            if (!lastActivityByLand.TryGetValue(landId, out var last) || last < staleBefore)
                result[landId] = Critical;
        }

        var todayLandIds = await db.Tasks.AsNoTracking()
            .Where(t => landIds.Contains(t.LandId)
                && t.DueDate == today
                && (t.Status == ProductionTaskStatus.Pending
                    || t.Status == ProductionTaskStatus.InProgress
                    || t.Status == ProductionTaskStatus.Overdue))
            .Select(t => t.LandId)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var id in todayLandIds)
        {
            if (result[id] == Critical)
                continue;
            result[id] = Today;
        }

        var harvests = await db.HarvestRecords.AsNoTracking()
            .Where(h => landIds.Contains(h.LandId))
            .Select(h => new { h.Id, h.LandId, h.Quantity })
            .ToListAsync(cancellationToken);
        var harvestIds = harvests.Select(h => h.Id).ToList();
        var deliveredMap = await db.DeliveryRecords.AsNoTracking()
            .Where(d => harvestIds.Contains(d.HarvestRecordId))
            .GroupBy(d => d.HarvestRecordId)
            .Select(g => new { HarvestRecordId = g.Key, Delivered = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.HarvestRecordId, x => x.Delivered, cancellationToken);

        foreach (var h in harvests)
        {
            deliveredMap.TryGetValue(h.Id, out var delivered);
            if (h.Quantity - delivered <= 0)
                continue;
            if (result[h.LandId] is Critical or Today)
                continue;
            result[h.LandId] = Harvest;
        }

        return result;
    }
}
