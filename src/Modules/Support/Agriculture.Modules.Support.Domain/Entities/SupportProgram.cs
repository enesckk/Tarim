using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Support.Domain.Entities;

public enum SupportProgramStatus
{
    Draft = 0,
    Open = 1,
    Closed = 2
}

public enum SupportAssignmentStatus
{
    Requested = 0,
    Approved = 1,
    Rejected = 2,
    Delivered = 3
}

public sealed class SupportProgram : AuditableEntity
{
    private SupportProgram() { }

    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string SupportType { get; private set; } = string.Empty;
    public DateOnly StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public SupportProgramStatus Status { get; private set; } = SupportProgramStatus.Draft;
    public decimal? Budget { get; private set; }

    public static SupportProgram Create(
        string name,
        string supportType,
        DateOnly startDate,
        string? description = null,
        DateOnly? endDate = null,
        decimal? budget = null)
    {
        return new SupportProgram
        {
            Name = name.Trim(),
            SupportType = supportType.Trim(),
            StartDate = startDate,
            Description = description,
            EndDate = endDate,
            Budget = budget
        };
    }

    public void Open()
    {
        Status = SupportProgramStatus.Open;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Close()
    {
        Status = SupportProgramStatus.Closed;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}

public sealed class SupportAssignment : AuditableEntity
{
    private SupportAssignment() { }

    public Guid SupportProgramId { get; private set; }
    public Guid ProducerId { get; private set; }
    public SupportAssignmentStatus Status { get; private set; } = SupportAssignmentStatus.Requested;
    public string? RequestNotes { get; private set; }
    public string? DecisionNotes { get; private set; }
    public DateTime? DecidedAtUtc { get; private set; }
    public DateTime? DeliveredAtUtc { get; private set; }

    public static SupportAssignment Request(Guid supportProgramId, Guid producerId, string? notes = null)
    {
        return new SupportAssignment
        {
            SupportProgramId = supportProgramId,
            ProducerId = producerId,
            RequestNotes = notes
        };
    }

    public void Approve(string? notes = null)
    {
        Status = SupportAssignmentStatus.Approved;
        DecisionNotes = notes;
        DecidedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Reject(string? notes = null)
    {
        Status = SupportAssignmentStatus.Rejected;
        DecisionNotes = notes;
        DecidedAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkDelivered()
    {
        Status = SupportAssignmentStatus.Delivered;
        DeliveredAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
