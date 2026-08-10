using System.Net.Http.Json;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Notifications.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Serilog;

/// <summary>Best-effort Expo push delivery for native mobile tokens.</summary>
internal static class ExpoPush
{
    private static readonly HttpClient Http = new()
    {
        BaseAddress = new Uri("https://exp.host/--/api/v2/push/")
    };

    public static async Task SendAsync(
        AgricultureDbContext db,
        Guid userId,
        string title,
        string body,
        object? data = null)
    {
        try
        {
            var tokens = await db.Set<DevicePushToken>().AsNoTracking()
                .Where(t => t.UserId == userId && !t.IsDeleted)
                .Select(t => new { t.Token, t.Platform })
                .ToListAsync();

            var expoTokens = tokens
                .Where(t =>
                    (t.Platform is "ios" or "android" or "unknown") &&
                    (t.Token.StartsWith("ExponentPushToken", StringComparison.Ordinal) ||
                     t.Token.StartsWith("ExpoPushToken", StringComparison.Ordinal)))
                .Select(t => t.Token)
                .Distinct()
                .ToList();

            if (expoTokens.Count == 0)
                return;

            var messages = expoTokens.Select(token => new Dictionary<string, object?>
            {
                ["to"] = token,
                ["sound"] = "default",
                ["title"] = title,
                ["body"] = body,
                ["data"] = data
            }).ToList();

            using var response = await Http.PostAsJsonAsync("send", messages);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                Log.Warning("Expo push failed {Status}: {Body}", response.StatusCode, err);
            }
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Expo push send error for user {UserId}", userId);
        }
    }
}
