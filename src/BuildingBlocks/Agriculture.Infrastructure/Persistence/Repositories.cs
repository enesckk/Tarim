using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.Modules.Harvest.Application.Abstractions;
using Agriculture.Modules.Harvest.Domain.Entities;
using Agriculture.Modules.Inspections.Application.Abstractions;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Application.Abstractions;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Seasons.Application.Abstractions;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.Modules.Support.Application.Abstractions;
using Agriculture.Modules.Support.Domain.Entities;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.Modules.Workflows.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Agriculture.Infrastructure.Persistence;

public sealed class ProducerRepository(AgricultureDbContext db) : IProducerRepository
{
    public Task<Producer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Producers.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<Producer?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        => db.Producers.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public async Task<IReadOnlyList<Producer>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Producers.AsNoTracking().OrderBy(x => x.LastName).ToListAsync(cancellationToken);

    public async Task AddAsync(Producer producer, CancellationToken cancellationToken = default)
        => await db.Producers.AddAsync(producer, cancellationToken);

    public void Update(Producer producer) => db.Producers.Update(producer);
}

public sealed class ProducerNoteRepository(AgricultureDbContext db) : IProducerNoteRepository
{
    public async Task<IReadOnlyList<ProducerNote>> GetByProducerIdAsync(
        Guid producerId,
        CancellationToken cancellationToken = default)
        => await db.ProducerNotes.AsNoTracking()
            .Where(x => x.ProducerId == producerId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(ProducerNote note, CancellationToken cancellationToken = default)
        => await db.ProducerNotes.AddAsync(note, cancellationToken);
}

public sealed class NotificationRepository(AgricultureDbContext db) : INotificationRepository
{
    public Task<Notification?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Notifications.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

    public async Task<IReadOnlyList<Notification>> GetByUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
        => await db.Notifications.AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Notification>> GetUnreadByUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
        => await db.Notifications
            .Where(x => x.UserId == userId && !x.IsDeleted && !x.IsRead)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Notification notification, CancellationToken cancellationToken = default)
        => await db.Notifications.AddAsync(notification, cancellationToken);

    public void Update(Notification notification) => db.Notifications.Update(notification);
}

public sealed class ConversationRepository(AgricultureDbContext db) : IConversationRepository
{
    public Task<Conversation?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Conversations.Include(x => x.Messages)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetByParticipantAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
        => await db.Conversations.AsNoTracking()
            .Include(x => x.Messages)
            .Where(x => !x.IsDeleted
                && (x.ProducerUserId == userId || x.OfficerUserId == userId || x.AdminUserId == userId))
            .OrderByDescending(x => x.LastMessageAtUtc ?? x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Conversations.AsNoTracking()
            .Include(x => x.Messages)
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.LastMessageAtUtc ?? x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Conversation>> GetForOfficerAsync(
        Guid officerUserId,
        CancellationToken cancellationToken = default)
        => await db.Conversations.AsNoTracking()
            .Include(x => x.Messages)
            .Where(x => !x.IsDeleted && x.OfficerUserId == officerUserId)
            .OrderByDescending(x => x.LastMessageAtUtc ?? x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public Task<Conversation?> GetOpenExpertThreadAsync(
        Guid producerUserId,
        Guid? landId = null,
        CancellationToken cancellationToken = default)
    {
        var query = db.Conversations.Where(x =>
            !x.IsDeleted
            && x.Type == ConversationType.Expert
            && x.ProducerUserId == producerUserId
            && x.Status == ConversationStatus.Open);

        if (landId.HasValue)
            query = query.Where(x => x.LandId == landId);

        return query.FirstOrDefaultAsync(cancellationToken);
    }

    public Task<Conversation?> GetOpenStaffThreadAsync(
        Guid adminUserId,
        Guid officerUserId,
        CancellationToken cancellationToken = default)
        => db.Conversations.FirstOrDefaultAsync(
            x => !x.IsDeleted
                && x.Type == ConversationType.Staff
                && x.AdminUserId == adminUserId
                && x.OfficerUserId == officerUserId
                && x.Status == ConversationStatus.Open,
            cancellationToken);

    public async Task AddAsync(Conversation conversation, CancellationToken cancellationToken = default)
        => await db.Conversations.AddAsync(conversation, cancellationToken);

    public void MarkMessageAdded(ChatMessage message)
    {
        var entry = db.Entry(message);
        if (entry.State == EntityState.Detached)
            db.ChatMessages.Add(message);
        else
            entry.State = EntityState.Added;
    }

    public void Update(Conversation conversation)
    {
        var entry = db.Entry(conversation);
        if (entry.State == EntityState.Detached)
            db.Conversations.Attach(conversation);
        entry.State = EntityState.Modified;
        foreach (var message in conversation.Messages)
        {
            var messageEntry = db.Entry(message);
            if (messageEntry.State == EntityState.Detached)
                MarkMessageAdded(message);
        }
    }
}

public sealed class LandRepository(AgricultureDbContext db) : ILandRepository
{
    public Task<Land?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Lands.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Land>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Lands.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Land>> GetByOfficerUserIdAsync(
        Guid officerUserId,
        CancellationToken cancellationToken = default)
        => await db.Lands.AsNoTracking()
            .Where(x => x.AssignedOfficerUserId == officerUserId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Land>> GetByProducerIdAsync(
        Guid producerId,
        CancellationToken cancellationToken = default)
        => await db.Lands.AsNoTracking()
            .Where(x => x.ProducerId == producerId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(Land land, CancellationToken cancellationToken = default)
        => await db.Lands.AddAsync(land, cancellationToken);

    public void Update(Land land) => db.Lands.Update(land);
}

public sealed class LandNoteRepository(AgricultureDbContext db) : ILandNoteRepository
{
    public async Task<IReadOnlyList<LandNote>> GetByLandIdAsync(
        Guid landId,
        CancellationToken cancellationToken = default)
        => await db.LandNotes.AsNoTracking()
            .Where(x => x.LandId == landId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(LandNote note, CancellationToken cancellationToken = default)
        => await db.LandNotes.AddAsync(note, cancellationToken);
}

public sealed class SeasonRepository(AgricultureDbContext db) : ISeasonRepository
{
    public Task<Season?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Seasons.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Season>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Seasons.AsNoTracking().OrderByDescending(x => x.Year).ToListAsync(cancellationToken);

    public async Task AddAsync(Season season, CancellationToken cancellationToken = default)
        => await db.Seasons.AddAsync(season, cancellationToken);

    public void Update(Season season) => db.Seasons.Update(season);
}

public sealed class WorkflowRepository(AgricultureDbContext db) : IWorkflowRepository
{
    public Task<Workflow?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Workflows.Include(x => x.Steps).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Workflow>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Workflows.AsNoTracking().Include(x => x.Steps).OrderBy(x => x.Name).ToListAsync(cancellationToken);

    public async Task AddAsync(Workflow workflow, CancellationToken cancellationToken = default)
        => await db.Workflows.AddAsync(workflow, cancellationToken);

    public void Update(Workflow workflow, IReadOnlyList<WorkflowStep>? removedSteps = null)
    {
        if (removedSteps is { Count: > 0 })
            db.WorkflowSteps.RemoveRange(removedSteps);
        db.Workflows.Update(workflow);
    }
}

public sealed class ProductionWorkflowRepository(AgricultureDbContext db) : IProductionWorkflowRepository
{
    public Task<ProductionWorkflow?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.ProductionWorkflows.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ProductionWorkflow>> GetByLandIdAsync(Guid landId, CancellationToken cancellationToken = default)
        => await db.ProductionWorkflows.AsNoTracking()
            .Where(x => x.LandId == landId)
            .OrderByDescending(x => x.StartedAtUtc ?? x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(ProductionWorkflow productionWorkflow, CancellationToken cancellationToken = default)
        => await db.ProductionWorkflows.AddAsync(productionWorkflow, cancellationToken);

    public void Update(ProductionWorkflow productionWorkflow) => db.ProductionWorkflows.Update(productionWorkflow);
}

public sealed class TaskRepository(AgricultureDbContext db) : ITaskRepository
{
    public Task<ProductionTask?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Tasks.Include(x => x.Photos).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ProductionTask>> GetByProducerAsync(Guid producerId, CancellationToken cancellationToken = default)
        => await db.Tasks.AsNoTracking()
            .Include(x => x.Photos)
            .Where(x => x.ProducerId == producerId)
            .OrderBy(x => x.DueDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ProductionTask>> GetByProductionWorkflowAsync(Guid productionWorkflowId, CancellationToken cancellationToken = default)
        => await db.Tasks
            .Include(x => x.Photos)
            .Where(x => x.ProductionWorkflowId == productionWorkflowId)
            .OrderBy(x => x.DueDate)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<ProductionTask>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Tasks.AsNoTracking()
            .Include(x => x.Photos)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task AddAsync(ProductionTask task, CancellationToken cancellationToken = default)
        => await db.Tasks.AddAsync(task, cancellationToken);

    public async Task AddRangeAsync(IEnumerable<ProductionTask> tasks, CancellationToken cancellationToken = default)
        => await db.Tasks.AddRangeAsync(tasks, cancellationToken);

    public void MarkPhotoAdded(TaskPhoto photo)
    {
        // Client-generated Guids are non-default; force Insert so EF does not UPDATE a missing row.
        var entry = db.Entry(photo);
        if (entry.State == EntityState.Detached)
            db.TaskPhotos.Add(photo);
        else
            entry.State = EntityState.Added;
    }

    public void Update(ProductionTask task)
    {
        // Avoid db.Update(graph) — it marks new child photos as Modified.
        var entry = db.Entry(task);
        if (entry.State == EntityState.Detached)
            db.Tasks.Attach(task);
        entry.State = EntityState.Modified;
        foreach (var photo in task.Photos)
        {
            var photoEntry = db.Entry(photo);
            if (photoEntry.State == EntityState.Detached)
                MarkPhotoAdded(photo);
        }
    }
}

public sealed class InspectionRepository(AgricultureDbContext db) : IInspectionRepository
{
    public Task<Inspection?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.Inspections.Include(x => x.Evidence).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Inspection>> GetByInspectorAsync(Guid inspectorUserId, CancellationToken cancellationToken = default)
        => await db.Inspections.AsNoTracking().Where(x => x.InspectorUserId == inspectorUserId).OrderBy(x => x.ScheduledDate).ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Inspection>> GetAllAsync(CancellationToken cancellationToken = default)
        => await db.Inspections.AsNoTracking().OrderByDescending(x => x.ScheduledDate).ToListAsync(cancellationToken);

    public async Task AddAsync(Inspection inspection, CancellationToken cancellationToken = default)
        => await db.Inspections.AddAsync(inspection, cancellationToken);

    public void Update(Inspection inspection) => db.Inspections.Update(inspection);
}

public sealed class HarvestRepository(AgricultureDbContext db) : IHarvestRepository
{
    public async Task AddHarvestAsync(HarvestRecord harvest, CancellationToken cancellationToken = default)
        => await db.HarvestRecords.AddAsync(harvest, cancellationToken);

    public async Task AddDeliveryAsync(DeliveryRecord delivery, CancellationToken cancellationToken = default)
        => await db.DeliveryRecords.AddAsync(delivery, cancellationToken);

    public async Task<IReadOnlyList<HarvestRecord>> GetHarvestsAsync(CancellationToken cancellationToken = default)
        => await db.HarvestRecords.AsNoTracking().OrderByDescending(x => x.HarvestDate).ToListAsync(cancellationToken);
}

public sealed class SupportRepository(AgricultureDbContext db) : ISupportRepository
{
    public Task<SupportProgram?> GetProgramByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => db.SupportPrograms.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<SupportProgram>> GetProgramsAsync(CancellationToken cancellationToken = default)
        => await db.SupportPrograms.AsNoTracking().OrderByDescending(x => x.StartDate).ToListAsync(cancellationToken);

    public async Task AddProgramAsync(SupportProgram program, CancellationToken cancellationToken = default)
        => await db.SupportPrograms.AddAsync(program, cancellationToken);

    public async Task AddAssignmentAsync(SupportAssignment assignment, CancellationToken cancellationToken = default)
        => await db.SupportAssignments.AddAsync(assignment, cancellationToken);

    public void UpdateProgram(SupportProgram program) => db.SupportPrograms.Update(program);
}
