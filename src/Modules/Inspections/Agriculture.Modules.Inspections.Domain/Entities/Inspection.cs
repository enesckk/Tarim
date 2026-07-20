using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Inspections.Domain.Entities;

public enum InspectionStatus
{
    Scheduled = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

public enum InspectionResult
{
    Pending = 0,
    Passed = 1,
    Failed = 2,
    Conditional = 3
}

public sealed class Inspection : AuditableEntity
{
    private readonly List<InspectionEvidence> _evidence = [];

    private Inspection() { }

    public Guid LandId { get; private set; }
    public Guid ProducerId { get; private set; }
    public Guid? SeasonId { get; private set; }
    public Guid? ProductionWorkflowId { get; private set; }
    public Guid InspectorUserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public DateOnly ScheduledDate { get; private set; }
    public InspectionStatus Status { get; private set; } = InspectionStatus.Scheduled;
    public InspectionResult Result { get; private set; } = InspectionResult.Pending;
    public string? Report { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    public IReadOnlyCollection<InspectionEvidence> Evidence => _evidence.AsReadOnly();

    public static Inspection Create(
        Guid landId,
        Guid producerId,
        Guid inspectorUserId,
        string title,
        DateOnly scheduledDate,
        string? description = null,
        Guid? seasonId = null,
        Guid? productionWorkflowId = null)
    {
        return new Inspection
        {
            LandId = landId,
            ProducerId = producerId,
            InspectorUserId = inspectorUserId,
            Title = title.Trim(),
            ScheduledDate = scheduledDate,
            Description = description,
            SeasonId = seasonId,
            ProductionWorkflowId = productionWorkflowId
        };
    }

    public void Start()
    {
        Status = InspectionStatus.InProgress;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void AddEvidence(string storageKey, string fileName, string contentType, string? notes = null)
    {
        _evidence.Add(InspectionEvidence.Create(Id, storageKey, fileName, contentType, notes));
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Complete(InspectionResult result, string report)
    {
        Status = InspectionStatus.Completed;
        Result = result;
        Report = report;
        CompletedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}

public sealed class InspectionEvidence : Entity
{
    private InspectionEvidence() { }

    public Guid InspectionId { get; private set; }
    public string StorageKey { get; private set; } = string.Empty;
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public DateTime UploadedAtUtc { get; private set; } = DateTime.UtcNow;

    public static InspectionEvidence Create(
        Guid inspectionId,
        string storageKey,
        string fileName,
        string contentType,
        string? notes)
    {
        return new InspectionEvidence
        {
            InspectionId = inspectionId,
            StorageKey = storageKey,
            FileName = fileName,
            ContentType = contentType,
            Notes = notes
        };
    }
}
