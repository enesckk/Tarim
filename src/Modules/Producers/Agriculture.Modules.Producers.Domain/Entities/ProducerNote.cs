using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Producers.Domain.Entities;

/// <summary>Staff note attached to a producer contact record.</summary>
public sealed class ProducerNote : Entity
{
    private ProducerNote() { }

    public Guid ProducerId { get; private set; }
    public Guid AuthorUserId { get; private set; }
    public string Body { get; private set; } = string.Empty;
    public DateTime CreatedAtUtc { get; private set; } = DateTime.UtcNow;

    public static ProducerNote Create(Guid producerId, Guid authorUserId, string body)
    {
        return new ProducerNote
        {
            ProducerId = producerId,
            AuthorUserId = authorUserId,
            Body = body.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };
    }
}
