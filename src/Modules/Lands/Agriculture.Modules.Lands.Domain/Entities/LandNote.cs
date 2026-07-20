using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Lands.Domain.Entities;

/// <summary>Expert / staff note attached to a land hub (SDS-R16).</summary>
public sealed class LandNote : Entity
{
    private LandNote() { }

    public Guid LandId { get; private set; }
    public Guid AuthorUserId { get; private set; }
    public string Body { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    public static LandNote Create(Guid landId, Guid authorUserId, string body)
    {
        return new LandNote
        {
            LandId = landId,
            AuthorUserId = authorUserId,
            Body = body.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
