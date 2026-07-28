using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Microsoft.EntityFrameworkCore;

internal static class FilesEndpoints
{
    public static RouteGroupBuilder MapFilesEndpoints(this RouteGroupBuilder api)
    {
        var files = api.MapGroup("/files").WithTags("Files").RequireAuthorization();

        // Authenticated download for local upload storage. Key shape: uploads/tasks/... or uploads/guidance/...
        files.MapGet("/{**key}", async (
            string key,
            IUserContext user,
            AgricultureDbContext db,
            IWebHostEnvironment env,
            HttpResponse response) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            if (!UploadPathResolver.TryNormalizeKey(key, out var normalized))
                return Results.NotFound();

            if (!await CanAccessAsync(user, normalized, db))
                return Results.Forbid();

            var fullPath = UploadPathResolver.ResolvePhysicalPath(env, normalized);
            if (fullPath is null || !File.Exists(fullPath))
                return Results.NotFound();

            response.Headers.CacheControl = "private, no-store";
            var contentType = GuessContentType(fullPath);
            return Results.File(fullPath, contentType, enableRangeProcessing: true);
        });

        return api;
    }

    private static async Task<bool> CanAccessAsync(
        IUserContext user,
        string normalizedKey,
        AgricultureDbContext db)
    {
        if (user.Roles.Contains(AppRoles.Administrator))
            return true;

        // Guidance images are instructional; any authenticated staff/producer may view.
        if (normalizedKey.StartsWith("uploads/guidance/", StringComparison.OrdinalIgnoreCase))
            return true;

        var photo = await db.TaskPhotos.AsNoTracking()
            .FirstOrDefaultAsync(p =>
                p.StorageKey == normalizedKey
                || p.StorageKey == "/" + normalizedKey);

        if (photo is null)
            return false;

        var task = await db.Tasks.AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == photo.TaskId && !t.IsDeleted);
        if (task is null)
            return false;

        if (user.Roles.Contains(AppRoles.Officer))
        {
            var land = await db.Lands.AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == task.LandId);
            return land is not null && land.AssignedOfficerUserId == user.UserId;
        }

        var producer = await db.Producers.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == user.UserId);
        return producer is not null && producer.Id == task.ProducerId;
    }

    private static string GuessContentType(string path)
    {
        return Path.GetExtension(path).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }
}

/// <summary>Resolves and validates local upload keys under wwwroot/uploads.</summary>
internal static class UploadPathResolver
{
    public static bool TryNormalizeKey(string? raw, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var key = raw.Trim().Replace('\\', '/');
        while (key.StartsWith('/'))
            key = key[1..];

        if (key.StartsWith("api/files/", StringComparison.OrdinalIgnoreCase))
            key = key["api/files/".Length..];

        if (!key.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            return false;

        if (key.Contains("..", StringComparison.Ordinal) || key.Contains(':', StringComparison.Ordinal))
            return false;

        normalized = key;
        return true;
    }

    public static string? ResolvePhysicalPath(IWebHostEnvironment env, string normalizedKey)
    {
        if (!TryNormalizeKey(normalizedKey, out var key))
            return null;

        var root = Path.GetFullPath(Path.Combine(env.ContentRootPath, "wwwroot"));
        var full = Path.GetFullPath(Path.Combine(env.ContentRootPath, "wwwroot", key.Replace('/', Path.DirectorySeparatorChar)));
        if (!full.StartsWith(root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(full, root, StringComparison.OrdinalIgnoreCase))
            return null;

        return full;
    }

    /// <summary>Public API path for a stored key (no host, no token).</summary>
    public static string ToApiPath(string storageKey)
    {
        if (!TryNormalizeKey(storageKey, out var key))
            return storageKey;
        return "/api/files/" + key;
    }
}
