using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Workflows.Domain.Entities;

public enum WorkflowStatus
{
    Draft = 0,
    Active = 1,
    Archived = 2
}

public sealed class Workflow : AuditableEntity
{
    private readonly List<WorkflowStep> _steps = [];

    private Workflow() { }

    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? CropType { get; private set; }
    public WorkflowStatus Status { get; private set; } = WorkflowStatus.Draft;
    public IReadOnlyCollection<WorkflowStep> Steps => _steps.AsReadOnly();

    public static Workflow Create(string name, string? description = null, string? cropType = null)
    {
        return new Workflow
        {
            Name = name.Trim(),
            Description = description,
            CropType = cropType
        };
    }

    public WorkflowStep AddStep(
        string name,
        string? description,
        int order,
        int? dueDaysFromStart = null,
        bool requiresPhoto = false,
        bool requiresQuantity = false,
        bool requiresDate = false,
        string? quantityUnit = null,
        string? videoUrl = null,
        string? imageUrl = null)
    {
        var step = WorkflowStep.Create(
            Id,
            name,
            description,
            order,
            dueDaysFromStart,
            requiresPhoto,
            requiresQuantity,
            requiresDate,
            quantityUnit,
            videoUrl,
            imageUrl);
        _steps.Add(step);
        UpdatedAtUtc = DateTime.UtcNow;
        return step;
    }

    public void UpdateDetails(string name, string? description, string? cropType)
    {
        Name = name.Trim();
        Description = description;
        CropType = cropType;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void ClearSteps()
    {
        _steps.Clear();
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>
    /// Update steps in place (stable IDs) so open tasks keep WorkflowStepId.
    /// Returns removed step entities for the repository to delete.
    /// </summary>
    public IReadOnlyList<WorkflowStep> SyncSteps(
        IReadOnlyList<(
            string Name,
            string? Description,
            int Order,
            int? DueDaysFromStart,
            bool RequiresPhoto,
            bool RequiresQuantity,
            bool RequiresDate,
            string? QuantityUnit,
            string? VideoUrl,
            string? ImageUrl)> incoming)
    {
        var ordered = incoming.OrderBy(s => s.Order).ToList();
        var removed = new List<WorkflowStep>();

        // Update overlapping by position in order
        var existingOrdered = _steps.OrderBy(s => s.Order).ToList();
        var overlap = Math.Min(existingOrdered.Count, ordered.Count);
        for (var i = 0; i < overlap; i++)
        {
            var cur = ordered[i];
            existingOrdered[i].Update(
                cur.Name,
                cur.Description,
                cur.Order,
                cur.DueDaysFromStart,
                cur.RequiresPhoto,
                cur.RequiresQuantity,
                cur.RequiresDate,
                cur.QuantityUnit,
                cur.VideoUrl,
                cur.ImageUrl);
        }

        // Remove extras
        for (var i = ordered.Count; i < existingOrdered.Count; i++)
        {
            var step = existingOrdered[i];
            _steps.Remove(step);
            removed.Add(step);
        }

        // Add new
        for (var i = existingOrdered.Count; i < ordered.Count; i++)
        {
            var cur = ordered[i];
            AddStep(
                cur.Name,
                cur.Description,
                cur.Order,
                cur.DueDaysFromStart,
                cur.RequiresPhoto,
                cur.RequiresQuantity,
                cur.RequiresDate,
                cur.QuantityUnit,
                cur.VideoUrl,
                cur.ImageUrl);
        }

        UpdatedAtUtc = DateTime.UtcNow;
        return removed;
    }

    public void Activate()
    {
        if (_steps.Count == 0)
            throw new InvalidOperationException("Workflow must have at least one step.");

        Status = WorkflowStatus.Active;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}

public sealed class WorkflowStep : Entity
{
    private WorkflowStep() { }

    public Guid WorkflowId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    /// <summary>Producer-facing guidance shown on the mobile task screen (optional).</summary>
    public string? Description { get; private set; }
    public int Order { get; private set; }
    /// <summary>Deadline: complete / enter into the system by day N after production start.</summary>
    public int? DueDaysFromStart { get; private set; }
    public bool RequiresPhoto { get; private set; }
    public bool RequiresQuantity { get; private set; }
    public bool RequiresDate { get; private set; }
    public string? QuantityUnit { get; private set; }
    /// <summary>Optional training video URL (YouTube / direct) shown to the producer.</summary>
    public string? VideoUrl { get; private set; }
    /// <summary>Optional guidance image path/URL shown to the producer.</summary>
    public string? ImageUrl { get; private set; }

    public static WorkflowStep Create(
        Guid workflowId,
        string name,
        string? description,
        int order,
        int? dueDaysFromStart,
        bool requiresPhoto,
        bool requiresQuantity = false,
        bool requiresDate = false,
        string? quantityUnit = null,
        string? videoUrl = null,
        string? imageUrl = null)
    {
        return new WorkflowStep
        {
            WorkflowId = workflowId,
            Name = name.Trim(),
            Description = description,
            Order = order,
            DueDaysFromStart = dueDaysFromStart,
            RequiresPhoto = requiresPhoto,
            RequiresQuantity = requiresQuantity,
            RequiresDate = requiresDate,
            QuantityUnit = requiresQuantity ? quantityUnit?.Trim() : null,
            VideoUrl = string.IsNullOrWhiteSpace(videoUrl) ? null : videoUrl.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim()
        };
    }

    public void Update(
        string name,
        string? description,
        int order,
        int? dueDaysFromStart,
        bool requiresPhoto,
        bool requiresQuantity,
        bool requiresDate,
        string? quantityUnit,
        string? videoUrl,
        string? imageUrl)
    {
        Name = name.Trim();
        Description = description;
        Order = order;
        DueDaysFromStart = dueDaysFromStart;
        RequiresPhoto = requiresPhoto;
        RequiresQuantity = requiresQuantity;
        RequiresDate = requiresDate;
        QuantityUnit = requiresQuantity ? quantityUnit?.Trim() : null;
        VideoUrl = string.IsNullOrWhiteSpace(videoUrl) ? null : videoUrl.Trim();
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl) ? null : imageUrl.Trim();
    }
}

public enum ProductionWorkflowStatus
{
    NotStarted = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
}

public sealed class ProductionWorkflow : AuditableEntity
{
    private ProductionWorkflow() { }

    public Guid SeasonId { get; private set; }
    public Guid WorkflowId { get; private set; }
    public Guid ProducerId { get; private set; }
    public Guid LandId { get; private set; }
    public ProductionWorkflowStatus Status { get; private set; } = ProductionWorkflowStatus.NotStarted;
    public int CurrentStepOrder { get; private set; }
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }

    public static ProductionWorkflow Assign(
        Guid seasonId,
        Guid workflowId,
        Guid producerId,
        Guid landId)
    {
        return new ProductionWorkflow
        {
            SeasonId = seasonId,
            WorkflowId = workflowId,
            ProducerId = producerId,
            LandId = landId
        };
    }

    public void Start()
    {
        Status = ProductionWorkflowStatus.InProgress;
        StartedAtUtc = DateTime.UtcNow;
        CurrentStepOrder = 1;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    /// <summary>Land stays; producer may change (SDS-R15). Open tasks should be updated by the application.</summary>
    public void ReassignProducer(Guid producerId)
    {
        if (Status == ProductionWorkflowStatus.Cancelled)
            throw new InvalidOperationException("İptal edilmiş üretime üretici atanamaz.");

        ProducerId = producerId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void AdvanceToStep(int stepOrder)
    {
        CurrentStepOrder = stepOrder;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Complete()
    {
        Status = ProductionWorkflowStatus.Completed;
        CompletedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
