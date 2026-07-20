using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Tasks.Domain.Entities;

public enum ProductionTaskStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2,
    Overdue = 3,
    Cancelled = 4
}

public sealed class ProductionTask : AuditableEntity
{
    private readonly List<TaskPhoto> _photos = [];

    private ProductionTask() { }

    public Guid ProductionWorkflowId { get; private set; }
    public Guid? WorkflowStepId { get; private set; }
    public Guid ProducerId { get; private set; }
    public Guid LandId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly? DueDate { get; private set; }
    public ProductionTaskStatus Status { get; private set; } = ProductionTaskStatus.Pending;
    public bool RequiresPhoto { get; private set; }
    public bool RequiresQuantity { get; private set; }
    public bool RequiresDate { get; private set; }
    public string? QuantityUnit { get; private set; }
    public string? CompletionNotes { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    public IReadOnlyCollection<TaskPhoto> Photos => _photos.AsReadOnly();

    public static ProductionTask Create(
        Guid productionWorkflowId,
        Guid producerId,
        Guid landId,
        string title,
        string? description = null,
        Guid? workflowStepId = null,
        DateOnly? dueDate = null,
        bool requiresPhoto = false,
        bool requiresQuantity = false,
        bool requiresDate = false,
        string? quantityUnit = null)
    {
        return new ProductionTask
        {
            ProductionWorkflowId = productionWorkflowId,
            ProducerId = producerId,
            LandId = landId,
            Title = title.Trim(),
            Description = description,
            WorkflowStepId = workflowStepId,
            DueDate = dueDate,
            RequiresPhoto = requiresPhoto,
            RequiresQuantity = requiresQuantity,
            RequiresDate = requiresDate,
            QuantityUnit = requiresQuantity ? quantityUnit?.Trim() : null
        };
    }

    public void ReassignProducer(Guid producerId)
    {
        if (Status is ProductionTaskStatus.Completed or ProductionTaskStatus.Cancelled)
            return;

        ProducerId = producerId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Start()
    {
        Status = ProductionTaskStatus.InProgress;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Complete(string? notes = null)
    {
        if (RequiresPhoto && _photos.Count == 0)
            throw new InvalidOperationException("Photo is required to complete this task.");

        Status = ProductionTaskStatus.Completed;
        CompletionNotes = notes;
        CompletedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public TaskPhoto AddPhoto(string storageKey, string fileName, string contentType)
    {
        var photo = TaskPhoto.Create(Id, storageKey, fileName, contentType);
        _photos.Add(photo);
        UpdatedAtUtc = DateTime.UtcNow;
        return photo;
    }

    public void MarkOverdue()
    {
        if (Status is ProductionTaskStatus.Pending or ProductionTaskStatus.InProgress)
            Status = ProductionTaskStatus.Overdue;
    }
}

public sealed class TaskPhoto : Entity
{
    private TaskPhoto() { }

    public Guid TaskId { get; private set; }
    public string StorageKey { get; private set; } = string.Empty;
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public DateTime UploadedAtUtc { get; private set; } = DateTime.UtcNow;

    public static TaskPhoto Create(Guid taskId, string storageKey, string fileName, string contentType)
    {
        return new TaskPhoto
        {
            TaskId = taskId,
            StorageKey = storageKey,
            FileName = fileName,
            ContentType = contentType
        };
    }
}
