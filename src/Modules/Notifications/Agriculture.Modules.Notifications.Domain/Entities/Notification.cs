using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Notifications.Domain.Entities;

public enum NotificationChannel
{
    InApp = 0,
    Push = 1,
    Email = 2
}

public sealed class Notification : AuditableEntity
{
    private Notification() { }

    public Guid UserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Body { get; private set; } = string.Empty;
    public NotificationChannel Channel { get; private set; } = NotificationChannel.InApp;
    public bool IsRead { get; private set; }
    public DateTime? ReadAtUtc { get; private set; }
    public string? RelatedEntityType { get; private set; }
    public Guid? RelatedEntityId { get; private set; }

    public static Notification Create(
        Guid userId,
        string title,
        string body,
        NotificationChannel channel = NotificationChannel.InApp,
        string? relatedEntityType = null,
        Guid? relatedEntityId = null)
    {
        return new Notification
        {
            UserId = userId,
            Title = title.Trim(),
            Body = body.Trim(),
            Channel = channel,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId
        };
    }

    public void MarkAsRead()
    {
        IsRead = true;
        ReadAtUtc = DateTime.UtcNow;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
