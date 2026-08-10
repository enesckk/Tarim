using System.Text.Json;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Notifications.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Serilog;
using WebPush;

/// <summary>Best-effort browser Web Push (VAPID) for PWA clients.</summary>
internal static class WebPushSender
{
    public static async Task SendAsync(
        AgricultureDbContext db,
        IConfiguration config,
        Guid userId,
        string title,
        string body,
        object? data = null)
    {
        var publicKey = config["WebPush:PublicKey"];
        var privateKey = config["WebPush:PrivateKey"];
        var subject = config["WebPush:Subject"] ?? "mailto:admin@agriculture.local";
        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(privateKey))
            return;

        try
        {
            var tokens = await db.Set<DevicePushToken>().AsNoTracking()
                .Where(t => t.UserId == userId && !t.IsDeleted && t.Platform == "web")
                .Select(t => t.Token)
                .Distinct()
                .ToListAsync();

            if (tokens.Count == 0)
                return;

            var client = new WebPushClient();
            var vapid = new VapidDetails(subject, publicKey, privateKey);
            var payload = JsonSerializer.Serialize(new
            {
                title,
                body,
                data
            });

            foreach (var token in tokens)
            {
                try
                {
                    using var doc = JsonDocument.Parse(token);
                    var root = doc.RootElement;
                    var endpoint = root.GetProperty("endpoint").GetString();
                    var p256dh = root.GetProperty("keys").GetProperty("p256dh").GetString();
                    var auth = root.GetProperty("keys").GetProperty("auth").GetString();
                    if (string.IsNullOrWhiteSpace(endpoint) ||
                        string.IsNullOrWhiteSpace(p256dh) ||
                        string.IsNullOrWhiteSpace(auth))
                        continue;

                    var subscription = new PushSubscription(endpoint, p256dh, auth);
                    await client.SendNotificationAsync(subscription, payload, vapid);
                }
                catch (Exception ex)
                {
                    Log.Warning(ex, "Web push failed for one subscription of user {UserId}", userId);
                }
            }
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Web push send error for user {UserId}", userId);
        }
    }
}
