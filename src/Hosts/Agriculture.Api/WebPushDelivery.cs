using System.Net;
using System.Text.Json;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Notifications.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Serilog;
using WebPush;

internal static class WebPushDelivery
{
    private static readonly object KeyLock = new();
    private static readonly JsonSerializerOptions WebJson = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
    private static VapidSettings? _cached;
    private static IConfiguration? _configuration;
    private static IWebHostEnvironment? _environment;

    public static void Configure(IConfiguration configuration, IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _environment = environment;
    }

    public static bool TryNormalizeSubscription(string raw, out string normalized)
    {
        normalized = string.Empty;
        try
        {
            var subscription = JsonSerializer.Deserialize<StoredWebSubscription>(raw, WebJson);
            if (subscription is null || !Uri.TryCreate(subscription.Endpoint, UriKind.Absolute, out var endpoint) ||
                endpoint.Scheme != Uri.UriSchemeHttps || string.IsNullOrWhiteSpace(subscription.P256dh) ||
                string.IsNullOrWhiteSpace(subscription.Auth)) return false;

            normalized = JsonSerializer.Serialize(subscription, WebJson);
            return normalized.Length <= 500;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    public static bool TryGetSettings(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        out VapidSettings settings)
    {
        var publicKey = configuration["WebPush:PublicKey"]?.Trim();
        var privateKey = configuration["WebPush:PrivateKey"]?.Trim();
        var subject = configuration["WebPush:Subject"]?.Trim() ?? "mailto:admin@agriculture.local";

        if (!string.IsNullOrWhiteSpace(publicKey) && !string.IsNullOrWhiteSpace(privateKey))
        {
            settings = new VapidSettings(subject, publicKey, privateKey);
            return true;
        }

        if (!environment.IsDevelopment())
        {
            settings = default!;
            return false;
        }

        lock (KeyLock)
        {
            if (_cached is not null)
            {
                settings = _cached;
                return true;
            }

            var path = Path.Combine(environment.ContentRootPath, ".dev-vapid.json");
            if (File.Exists(path))
            {
                var saved = JsonSerializer.Deserialize<VapidKeyFile>(File.ReadAllText(path));
                if (saved is not null && !string.IsNullOrWhiteSpace(saved.PublicKey) && !string.IsNullOrWhiteSpace(saved.PrivateKey))
                {
                    _cached = new VapidSettings(subject, saved.PublicKey, saved.PrivateKey);
                    settings = _cached;
                    return true;
                }
            }

            var generated = VapidHelper.GenerateVapidKeys();
            Directory.CreateDirectory(environment.ContentRootPath);
            File.WriteAllText(path, JsonSerializer.Serialize(new VapidKeyFile(generated.PublicKey, generated.PrivateKey)));
            _cached = new VapidSettings(subject, generated.PublicKey, generated.PrivateKey);
            settings = _cached;
            return true;
        }
    }

    public static async Task SendAsync(
        AgricultureDbContext db,
        Guid userId,
        string title,
        string body,
        object? data = null)
    {
        var configuration = _configuration;
        var environment = _environment;
        if (configuration is null || environment is null) return;
        if (!TryGetSettings(configuration, environment, out var keys))
        {
            Log.Warning("Web Push is disabled because VAPID keys are not configured.");
            return;
        }

        var records = await db.Set<DevicePushToken>()
            .Where(t => t.UserId == userId && !t.IsDeleted && t.Platform == "web-push")
            .ToListAsync();
        if (records.Count == 0) return;

        var payload = JsonSerializer.Serialize(new
        {
            title,
            body,
            url = WebPushUrl(data),
            icon = "/pwa-192x192.png",
            badge = "/pwa-192x192.png"
        });
        var client = new WebPushClient();
        var vapid = new VapidDetails(keys.Subject, keys.PublicKey, keys.PrivateKey);

        foreach (var record in records)
        {
            try
            {
                var stored = JsonSerializer.Deserialize<StoredWebSubscription>(record.Token, WebJson);
                if (stored is null || string.IsNullOrWhiteSpace(stored.Endpoint) ||
                    string.IsNullOrWhiteSpace(stored.P256dh) || string.IsNullOrWhiteSpace(stored.Auth))
                {
                    db.DevicePushTokens.Remove(record);
                    continue;
                }

                await client.SendNotificationAsync(
                    new PushSubscription(stored.Endpoint, stored.P256dh, stored.Auth),
                    payload,
                    vapid);
            }
            catch (WebPushException exception) when (
                exception.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            {
                db.DevicePushTokens.Remove(record);
            }
            catch (Exception exception)
            {
                Log.Warning(exception, "Web Push send error for user {UserId}", userId);
            }
        }

        if (db.ChangeTracker.HasChanges()) await db.SaveChangesAsync();
    }

    private static string WebPushUrl(object? data)
    {
        if (data is null) return "/producer/notifications";
        var json = JsonSerializer.SerializeToElement(data);
        if (json.TryGetProperty("taskId", out var taskId) && taskId.ValueKind == JsonValueKind.String)
            return $"/producer/tasks/{taskId.GetString()}";
        if (json.TryGetProperty("conversationId", out var conversationId) && conversationId.ValueKind == JsonValueKind.String)
            return $"/producer/messages/{conversationId.GetString()}";
        return "/producer/notifications";
    }

    internal sealed record VapidSettings(string Subject, string PublicKey, string PrivateKey);
    private sealed record VapidKeyFile(string PublicKey, string PrivateKey);
    private sealed record StoredWebSubscription(string Endpoint, string P256dh, string Auth);
}
