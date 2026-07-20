using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Seasons.Domain.Entities;

public enum SeasonStatus
{
    Draft = 0,
    Active = 1,
    Completed = 2,
    Cancelled = 3
}

public sealed class Season : AuditableEntity
{
    private Season() { }

    public string Name { get; private set; } = string.Empty;
    public int Year { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly? EndDate { get; private set; }
    public SeasonStatus Status { get; private set; } = SeasonStatus.Draft;
    public string? Description { get; private set; }

    public static Season Create(string name, int year, DateOnly startDate, string? description = null)
    {
        return new Season
        {
            Name = name.Trim(),
            Year = year,
            StartDate = startDate,
            Description = description
        };
    }

    public void Start()
    {
        if (Status != SeasonStatus.Draft)
            throw new InvalidOperationException("Only draft seasons can be started.");

        Status = SeasonStatus.Active;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void End(DateOnly endDate)
    {
        if (Status != SeasonStatus.Active)
            throw new InvalidOperationException("Only active seasons can be ended.");

        Status = SeasonStatus.Completed;
        EndDate = endDate;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
