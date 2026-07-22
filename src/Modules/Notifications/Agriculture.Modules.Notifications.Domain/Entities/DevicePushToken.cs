using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Notifications.Domain.Entities;

/// <summary>Expo push token registered by a mobile device.</summary>
public sealed class DevicePushToken : AuditableEntity
{
    private DevicePushToken() { }

    public Guid UserId { get; private set; }
    public string Token { get; private set; } = string.Empty;
    public string Platform { get; private set; } = "unknown";
    public DateTime LastSeenAtUtc { get; private set; } = DateTime.UtcNow;

    public static DevicePushToken Create(Guid userId, string token, string? platform)
    {
        return new DevicePushToken
        {
            UserId = userId,
            Token = token.Trim(),
            Platform = string.IsNullOrWhiteSpace(platform) ? "unknown" : platform.Trim().ToLowerInvariant(),
            LastSeenAtUtc = DateTime.UtcNow
        };
    }

    public void Touch(string? platform = null)
    {
        LastSeenAtUtc = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(platform))
            Platform = platform.Trim().ToLowerInvariant();
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
