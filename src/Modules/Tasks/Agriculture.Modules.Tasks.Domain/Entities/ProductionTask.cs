using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Tasks.Domain.Entities;

public enum ProductionTaskStatus
{
    Pending = 0,
    InProgress = 1,
    /// <summary>Uzman/admin onayladı — nihai tamamlanma.</summary>
    Completed = 2,
    Overdue = 3,
    Cancelled = 4,
    /// <summary>Üretici gönderdi; uzman/admin onayı bekleniyor.</summary>
    AwaitingApproval = 5,
    /// <summary>Uzman düzeltme istedi — üretici yeniden göndermeli.</summary>
    NeedsRevision = 6
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
    /// <summary>İşlem teması kodu (Sulama, Gubreleme, …). Eski görevlerde null olabilir.</summary>
    public string? Theme { get; private set; }
    /// <summary>Copied from workflow step — training video for the producer.</summary>
    public string? VideoUrl { get; private set; }
    /// <summary>Copied from workflow step — guidance image for the producer.</summary>
    public string? ImageUrl { get; private set; }
    public string? CompletionNotes { get; private set; }
    /// <summary>Uzmanın görev oluştururken girdiği planlanan/hedef kanıt (JSON).</summary>
    public string? PlannedEvidenceJson { get; private set; }
    /// <summary>Üreticinin tamamlamada girdiği gerçekleşen kanıt (JSON).</summary>
    public string? EvidenceJson { get; private set; }
    /// <summary>Officer feedback when requesting revision.</summary>
    public string? RevisionReason { get; private set; }
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
        string? quantityUnit = null,
        string? videoUrl = null,
        string? imageUrl = null,
        string? theme = null,
        string? plannedEvidenceJson = null)
    {
        string? normalizedTheme = null;
        if (!string.IsNullOrWhiteSpace(theme))
        {
            if (!TaskThemes.TryNormalize(theme, out var t))
                throw new ArgumentException("Geçersiz işlem teması.", nameof(theme));
            normalizedTheme = t;
            TaskThemes.ApplyCreateDefaults(t, out requiresPhoto);
        }

        return new ProductionTask
        {
            ProductionWorkflowId = productionWorkflowId,
            ProducerId = producerId,
            LandId = landId,
            Title = title.Trim(),
            Description = description,
            WorkflowStepId = workflowStepId,
            DueDate = dueDate,
            Theme = normalizedTheme,
            PlannedEvidenceJson = string.IsNullOrWhiteSpace(plannedEvidenceJson) ? null : plannedEvidenceJson,
            RequiresPhoto = requiresPhoto,
            RequiresQuantity = requiresQuantity,
            RequiresDate = requiresDate,
            QuantityUnit = requiresQuantity ? quantityUnit?.Trim() : null,
            VideoUrl = string.IsNullOrWhiteSpace(videoUrl) ? null : videoUrl.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim()
        };
    }

    public bool IsOpenWork =>
        Status is ProductionTaskStatus.Pending
            or ProductionTaskStatus.InProgress
            or ProductionTaskStatus.Overdue
            or ProductionTaskStatus.NeedsRevision;

    public void ReassignProducer(Guid producerId)
    {
        if (Status is ProductionTaskStatus.Completed
            or ProductionTaskStatus.Cancelled
            or ProductionTaskStatus.AwaitingApproval)
            return;

        ProducerId = producerId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Start()
    {
        Status = ProductionTaskStatus.InProgress;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>Producer submits work for uzman/admin approval (not final yet).</summary>
    public void Complete(string? notes = null, string? evidenceJson = null)
    {
        if (Status is ProductionTaskStatus.Completed or ProductionTaskStatus.Cancelled)
            throw new InvalidOperationException("Bu görev zaten kapanmış.");

        if (Status is ProductionTaskStatus.AwaitingApproval)
            throw new InvalidOperationException("Bu görev zaten onay bekliyor.");

        var themeMinPhotos = TaskThemes.MinPhotoCount(Theme);
        if (themeMinPhotos > 0)
        {
            if (_photos.Count < themeMinPhotos)
            {
                throw new InvalidOperationException(
                    Theme == TaskThemes.Bakim
                        ? "Bakım görevi için öncesi ve sonrası olmak üzere en az 2 fotoğraf gerekli."
                        : "Bu görevi tamamlamak için fotoğraf gerekli.");
            }
        }
        else if (RequiresPhoto && _photos.Count == 0)
        {
            throw new InvalidOperationException("Bu görevi tamamlamak için fotoğraf gerekli.");
        }

        Status = ProductionTaskStatus.AwaitingApproval;
        CompletionNotes = notes;
        EvidenceJson = string.IsNullOrWhiteSpace(evidenceJson) ? null : evidenceJson;
        RevisionReason = null;
        CompletedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Approve()
    {
        if (Status is not ProductionTaskStatus.AwaitingApproval)
            throw new InvalidOperationException("Yalnızca onay bekleyen görevler onaylanabilir.");

        Status = ProductionTaskStatus.Completed;
        RevisionReason = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>Officer sends task back to producer for fixes.</summary>
    public void RequestRevision(string reason)
    {
        if (Status is not ProductionTaskStatus.AwaitingApproval)
            throw new InvalidOperationException("Yalnızca onay bekleyen görevler düzeltmeye gönderilebilir.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new InvalidOperationException("Düzeltme nedeni gerekli.");

        Status = ProductionTaskStatus.NeedsRevision;
        RevisionReason = reason.Trim();
        CompletedAtUtc = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Staff cancels an open task (pending / in progress / overdue / needs revision / awaiting approval).
    /// Completed (approved) or already cancelled tasks cannot be cancelled.
    /// </summary>
    public void Cancel()
    {
        if (Status is ProductionTaskStatus.Completed or ProductionTaskStatus.Cancelled)
            throw new InvalidOperationException(
                "Onaylanmış veya zaten iptal edilmiş görevler iptal edilemez.");

        if (Status is not (
            ProductionTaskStatus.Pending
            or ProductionTaskStatus.InProgress
            or ProductionTaskStatus.Overdue
            or ProductionTaskStatus.NeedsRevision
            or ProductionTaskStatus.AwaitingApproval))
            throw new InvalidOperationException("Bu görev iptal edilemez.");

        Status = ProductionTaskStatus.Cancelled;
        RevisionReason = null;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>Sync producer-facing guidance from updated workflow step.</summary>
    public void UpdateGuidance(
        string? description,
        string? videoUrl,
        string? imageUrl,
        Guid? workflowStepId = null)
    {
        SyncFromWorkflowStep(
            description,
            videoUrl,
            imageUrl,
            RequiresPhoto,
            RequiresQuantity,
            RequiresDate,
            QuantityUnit,
            Theme,
            PlannedEvidenceJson,
            workflowStepId);
    }

    /// <summary>
    /// Copy guidance + evidence rules from the workflow template onto an open task
    /// so producers see links / planned targets without re-assigning the production.
    /// </summary>
    public void SyncFromWorkflowStep(
        string? description,
        string? videoUrl,
        string? imageUrl,
        bool requiresPhoto,
        bool requiresQuantity,
        bool requiresDate,
        string? quantityUnit,
        string? theme,
        string? plannedEvidenceJson,
        Guid? workflowStepId = null)
    {
        // Freeze submitted / closed work — only editable open statuses sync from template.
        if (!IsOpenWork)
            return;

        Description = description;
        VideoUrl = string.IsNullOrWhiteSpace(videoUrl) ? null : videoUrl.Trim();
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
        RequiresPhoto = requiresPhoto;
        RequiresQuantity = requiresQuantity;
        RequiresDate = requiresDate;
        QuantityUnit = requiresQuantity ? quantityUnit?.Trim() : null;

        if (!string.IsNullOrWhiteSpace(theme) && TaskThemes.TryNormalize(theme, out var normalized))
        {
            Theme = normalized;
            TaskThemes.ApplyCreateDefaults(normalized, out var themeRequiresPhoto);
            RequiresPhoto = themeRequiresPhoto;
        }
        else if (string.IsNullOrWhiteSpace(theme))
        {
            Theme = null;
        }

        PlannedEvidenceJson = string.IsNullOrWhiteSpace(plannedEvidenceJson)
            ? null
            : plannedEvidenceJson;

        if (workflowStepId.HasValue)
            WorkflowStepId = workflowStepId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public TaskPhoto AddPhoto(string storageKey, string fileName, string contentType)
    {
        if (Status is ProductionTaskStatus.Completed or ProductionTaskStatus.Cancelled)
            throw new InvalidOperationException("Kapalı göreve fotoğraf eklenemez.");

        var photo = TaskPhoto.Create(Id, storageKey, fileName, contentType);
        _photos.Add(photo);
        UpdatedAtUtc = DateTime.UtcNow;
        return photo;
    }

    public void MarkOverdue()
    {
        if (Status is ProductionTaskStatus.Pending
            or ProductionTaskStatus.InProgress
            or ProductionTaskStatus.NeedsRevision)
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
