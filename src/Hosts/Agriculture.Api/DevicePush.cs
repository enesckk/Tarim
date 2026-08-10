using Agriculture.Infrastructure.Persistence;

/// <summary>Dispatches both Expo (native) and Web Push (PWA) notifications.</summary>
internal static class DevicePush
{
    public static async Task SendAsync(
        AgricultureDbContext db,
        IConfiguration config,
        Guid userId,
        string title,
        string body,
        object? data = null)
    {
        await ExpoPush.SendAsync(db, userId, title, body, data);
        await WebPushSender.SendAsync(db, config, userId, title, body, data);
    }
}
