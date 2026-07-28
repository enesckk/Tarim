using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Tasks.Application.Commands.AddTaskPhoto;
using Agriculture.Modules.Tasks.Application.Commands.ApproveTask;
using Agriculture.Modules.Tasks.Application.Commands.RejectTask;
using Agriculture.Modules.Tasks.Application.Commands.CompleteTask;
using Agriculture.Modules.Tasks.Application.Commands.CreateTask;
using Agriculture.Modules.Tasks.Application;
using Agriculture.Modules.Tasks.Application.Queries.GetTaskById;
using Agriculture.Modules.Tasks.Application.Queries.GetTasks;
using Agriculture.Modules.Tasks.Application.Queries.GetTodayTasks;
using Agriculture.Modules.Tasks.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Serilog;

internal static class TasksEndpoints
{
    public static RouteGroupBuilder MapTasksEndpoints(this RouteGroupBuilder api)
    {
        // Tasks
        var tasks = api.MapGroup("/tasks").WithTags("Tasks").RequireAuthorization();
        tasks.MapGet("/", async ([FromQuery] Guid? producerId, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            // Admin: full list (optional producerId filter).
            if (user.Roles.Contains(AppRoles.Administrator))
                return ApiResults.From(await sender.Send(new GetTasksQuery(producerId)));

            // Officer: only tasks on assigned lands (filter in DB, not in memory).
            if (user.Roles.Contains(AppRoles.Officer))
            {
                var landIds = await db.Lands.AsNoTracking()
                    .Where(l => l.AssignedOfficerUserId == user.UserId)
                    .Select(l => l.Id)
                    .ToListAsync();
                return ApiResults.From(await sender.Send(new GetTasksQuery(producerId, landIds)));
            }

            // Producer: force own ProducerId — ignore arbitrary query filter.
            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId);
            if (producer is null)
                return Results.Ok(Array.Empty<object>());

            if (producerId.HasValue && producerId.Value != producer.Id)
                return Results.Forbid();

            return ApiResults.From(await sender.Send(new GetTasksQuery(producer.Id)));
        });
        tasks.MapGet("/today", async (
            IUserContext user,
            AgricultureDbContext db,
            ISender sender,
            IMemoryCache cache,
            IHostEnvironment environment) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId);
            if (producer is null)
                return Results.Ok(Array.Empty<object>());

            // Demo resilience: only in Development — re-stock open tasks after walkthrough completion.
            if (environment.IsDevelopment() && producer.Id == DatabaseInitializer.DemoProducerId)
            {
                var before = await db.Tasks.CountAsync(t =>
                    t.ProducerId == DatabaseInitializer.DemoProducerId
                    && (t.Status == ProductionTaskStatus.Pending
                        || t.Status == ProductionTaskStatus.InProgress
                        || t.Status == ProductionTaskStatus.Overdue));
                await DatabaseInitializer.EnsureOpenDemoTasksAsync(db, user.UserId.Value);
                var after = await db.Tasks.CountAsync(t =>
                    t.ProducerId == DatabaseInitializer.DemoProducerId
                    && (t.Status == ProductionTaskStatus.Pending
                        || t.Status == ProductionTaskStatus.InProgress
                        || t.Status == ProductionTaskStatus.Overdue));
                if (after != before)
                    DashboardCache.Invalidate(cache);
            }

            return ApiResults.From(await sender.Send(new GetTodayTasksQuery(producer.Id)));
        });
        // Officer/Admin: tasks waiting for approval on assigned (or all) lands
        tasks.MapGet("/pending-approval", async (IUserContext user, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
                return Results.Forbid();

            IQueryable<ProductionTask> query = db.Tasks.AsNoTracking()
                .Include(t => t.Photos)
                .Where(t => !t.IsDeleted && t.Status == ProductionTaskStatus.AwaitingApproval);

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var landIds = await db.Lands.AsNoTracking()
                    .Where(l => l.AssignedOfficerUserId == user.UserId)
                    .Select(l => l.Id)
                    .ToListAsync();
                query = query.Where(t => landIds.Contains(t.LandId));
            }

            var items = await query
                .OrderBy(t => t.CompletedAtUtc)
                .ThenBy(t => t.Title)
                .ToListAsync();

            var landNames = await db.Lands.AsNoTracking()
                .Where(l => items.Select(t => t.LandId).Contains(l.Id))
                .Select(l => new { l.Id, l.Name })
                .ToDictionaryAsync(x => x.Id, x => x.Name);

            return Results.Ok(items.Select(t =>
            {
                var variance = TaskEvidenceHelper.EvaluateVariance(t.PlannedEvidenceJson, t.EvidenceJson);
                return new
                {
                    t.Id,
                    t.ProducerId,
                    t.LandId,
                    LandName = landNames.GetValueOrDefault(t.LandId),
                    t.Title,
                    t.Description,
                    DueDate = t.DueDate,
                    Status = (int)t.Status,
                    t.RequiresPhoto,
                    t.RequiresQuantity,
                    t.RequiresDate,
                    t.QuantityUnit,
                    t.Theme,
                    t.VideoUrl,
                    t.ImageUrl,
                    t.RevisionReason,
                    t.CompletionNotes,
                    t.PlannedEvidenceJson,
                    t.EvidenceJson,
                    t.CompletedAtUtc,
                    PhotoCount = t.Photos.Count,
                    HasVarianceWarning = variance.HasWarning,
                    VarianceWarning = variance.Message,
                    Photos = t.Photos
                        .OrderByDescending(p => p.UploadedAtUtc)
                        .Select(p => new
                        {
                            p.Id,
                            p.StorageKey,
                            p.FileName,
                            p.ContentType,
                            p.UploadedAtUtc
                        })
                        .ToList()
                };
            }));
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        tasks.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var result = await sender.Send(new GetTaskByIdQuery(id));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            var task = result.Value;
            if (user.Roles.Contains(AppRoles.Administrator))
                return ApiResults.From(result);

            if (user.Roles.Contains(AppRoles.Officer))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == task.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
                return ApiResults.From(result);
            }

            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId);
            if (producer is null || producer.Id != task.ProducerId)
                return Results.Forbid();

            return ApiResults.From(result);
        });
        tasks.MapPost("/", async (
            CreateTaskCommand command,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db,
            IMemoryCache cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == command.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            var result = await sender.Send(command);
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        // Photo upload: multipart file or base64 JSON that writes real bytes to wwwroot/uploads.
        tasks.MapPost("/{id:guid}/photos", async (
            Guid id,
            HttpRequest request,
            IWebHostEnvironment env,
            ISender sender,
            IMemoryCache cache,
            IUserContext user,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (task is null)
                return Results.NotFound(new { Code = "Task.NotFound", Message = "Görev bulunamadı." });

            var allowed = false;
            if (user.Roles.Contains(AppRoles.Administrator))
                allowed = true;
            else if (user.Roles.Contains(AppRoles.Officer))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == task.LandId);
                allowed = land is not null && land.AssignedOfficerUserId == user.UserId;
            }
            else
            {
                var producer = await db.Producers.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == user.UserId);
                allowed = producer is not null && producer.Id == task.ProducerId;
            }

            if (!allowed)
                return Results.Forbid();

            try
            {
                var saved = await TaskPhotoStorage.SaveAsync(id, request, env);
                if (saved is null)
                    return Results.BadRequest(new { Code = "Photo.Missing", Message = "Fotoğraf dosyası gerekli." });

                var result = await sender.Send(new AddTaskPhotoCommand(
                    id,
                    saved.StorageKey,
                    saved.FileName,
                    saved.ContentType));
                if (result.IsSuccess)
                    DashboardCache.Invalidate(cache);
                return ApiResults.From(result);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Code = "Photo.Invalid", Message = ex.Message });
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Photo upload failed for task {TaskId}", id);
                return Results.BadRequest(new { Code = "Photo.UploadFailed", Message = "Fotoğraf yüklenemedi." });
            }
        }).DisableAntiforgery();
        tasks.MapPost("/{id:guid}/complete", async (
            Guid id,
            [FromBody] CompleteTaskRequest? body,
            ISender sender,
            IMemoryCache cache,
            AgricultureDbContext db,
            IUserContext user) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var existing = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (existing is null)
                return Results.NotFound(new { Code = "Task.NotFound", Message = "Görev bulunamadı." });

            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId);
            if (producer is null || producer.Id != existing.ProducerId)
                return Results.Forbid();

            var result = await sender.Send(new CompleteTaskCommand(id, body?.Notes, body?.Evidence));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            DashboardCache.Invalidate(cache);

            // Notify assigned uzman that approval is needed.
            var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (task is not null)
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == task.LandId);
                if (land?.AssignedOfficerUserId is Guid officerId)
                {
                    await db.Notifications.AddAsync(Notification.Create(
                        officerId,
                        "Görev onay bekliyor",
                        $"“{task.Title}” üretici tarafından gönderildi. Onayınızı bekliyor.",
                        relatedEntityType: "Task",
                        relatedEntityId: task.Id));
                    await db.SaveChangesAsync();
                    await ExpoPush.SendAsync(
                        db,
                        officerId,
                        "Görev onay bekliyor",
                        $"“{task.Title}” onayınızı bekliyor.",
                        new { type = "task", taskId = task.Id });
                }
            }

            return ApiResults.From(result);
        });
        tasks.MapPost("/{id:guid}/approve", async (
            Guid id,
            ISender sender,
            IMemoryCache cache,
            AgricultureDbContext db,
            IUserContext user) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
                return Results.Forbid();

            var existing = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (existing is null)
                return Results.NotFound(new { Code = "Task.NotFound", Message = "Görev bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == existing.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            var result = await sender.Send(new ApproveTaskCommand(id));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            DashboardCache.Invalidate(cache);

            var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (task is not null)
            {
                var producer = await db.Producers.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == task.ProducerId);
                if (producer?.UserId is Guid producerUserId)
                {
                    await db.Notifications.AddAsync(Notification.Create(
                        producerUserId,
                        "Göreviniz onaylandı",
                        $"“{task.Title}” uzman tarafından onaylandı.",
                        relatedEntityType: "Task",
                        relatedEntityId: task.Id));
                    await db.SaveChangesAsync();
                    await ExpoPush.SendAsync(
                        db,
                        producerUserId,
                        "Göreviniz onaylandı",
                        $"“{task.Title}” onaylandı.",
                        new { type = "task", taskId = task.Id });
                }
            }

            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        tasks.MapPost("/{id:guid}/reject", async (
            Guid id,
            [FromBody] RejectTaskRequest? body,
            ISender sender,
            IMemoryCache cache,
            AgricultureDbContext db,
            IUserContext user) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
                return Results.Forbid();

            var reason = body?.Reason?.Trim();
            if (string.IsNullOrWhiteSpace(reason))
                return Results.BadRequest(new { Code = "Task.ReasonRequired", Message = "Düzeltme nedeni gerekli." });

            var existing = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (existing is null)
                return Results.NotFound(new { Code = "Task.NotFound", Message = "Görev bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == existing.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            var result = await sender.Send(new RejectTaskCommand(id, reason));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            DashboardCache.Invalidate(cache);

            var task = await db.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (task is not null)
            {
                var producer = await db.Producers.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == task.ProducerId);
                if (producer?.UserId is Guid producerUserId)
                {
                    await db.Notifications.AddAsync(Notification.Create(
                        producerUserId,
                        "Düzeltme gerekli",
                        $"“{task.Title}”: {reason}",
                        relatedEntityType: "Task",
                        relatedEntityId: task.Id));
                    await db.SaveChangesAsync();
                    await ExpoPush.SendAsync(
                        db,
                        producerUserId,
                        "Düzeltme gerekli",
                        $"“{task.Title}”: {reason}",
                        new { type = "task", taskId = task.Id });
                }
            }

            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        tasks.MapPost("/{id:guid}/cancel", async (
            Guid id,
            IMemoryCache cache,
            AgricultureDbContext db,
            IUserContext user) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (!user.Roles.Contains(AppRoles.Administrator) && !user.Roles.Contains(AppRoles.Officer))
                return Results.Forbid();

            var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
            if (task is null)
                return Results.NotFound(new { Code = "Task.NotFound", Message = "Görev bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == task.LandId);
                if (land is null || land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            try
            {
                task.Cancel();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { Code = "Task.InvalidState", Message = ex.Message });
            }

            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == task.ProducerId);
            if (producer?.UserId is Guid producerUserId)
            {
                await db.Notifications.AddAsync(Notification.Create(
                    producerUserId,
                    "Göreviniz iptal edildi",
                    $"“{task.Title}” uzman tarafından iptal edildi.",
                    relatedEntityType: "Task",
                    relatedEntityId: task.Id));
            }

            await db.SaveChangesAsync();
            DashboardCache.Invalidate(cache);

            if (producer?.UserId is Guid pushUserId)
            {
                await ExpoPush.SendAsync(
                    db,
                    pushUserId,
                    "Göreviniz iptal edildi",
                    $"“{task.Title}” iptal edildi.",
                    new { type = "task", taskId = task.Id });
            }

            return Results.NoContent();
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        return api;
    }
}

internal sealed record CompleteTaskRequest(string? Notes = null, TaskEvidenceDto? Evidence = null);
internal sealed record RejectTaskRequest(string Reason);
internal sealed record AddTaskPhotoRequest(
    string? FileName,
    string? ContentType,
    string? Base64Content = null);
internal sealed record SavedTaskPhoto(string StorageKey, string FileName, string ContentType);

internal static class TaskPhotoStorage
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    };

    public static async Task<SavedTaskPhoto?> SaveAsync(Guid taskId, HttpRequest request, IWebHostEnvironment env)
    {
        if (request.HasFormContentType)
        {
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
            if (file is null || file.Length == 0)
                return null;

            return await WriteFileAsync(taskId, env, file.OpenReadStream(), file.FileName, file.ContentType);
        }

        var body = await request.ReadFromJsonAsync<AddTaskPhotoRequest>();
        if (body is null)
            return null;

        // Metadata-only uploads are rejected — a real file (or base64 bytes) is required.
        if (string.IsNullOrWhiteSpace(body.Base64Content))
            throw new InvalidOperationException(
                "Yalnızca metadata ile fotoğraf eklenemez. Dosya veya base64 içerik gerekli.");

        var bytes = Convert.FromBase64String(body.Base64Content);
        if (bytes.Length == 0)
            return null;

        await using var stream = new MemoryStream(bytes);
        return await WriteFileAsync(
            taskId,
            env,
            stream,
            body.FileName ?? "photo.jpg",
            body.ContentType ?? "image/jpeg");
    }

    private static async Task<SavedTaskPhoto> WriteFileAsync(
        Guid taskId,
        IWebHostEnvironment env,
        Stream content,
        string? originalFileName,
        string? contentType)
    {
        var normalizedType = string.IsNullOrWhiteSpace(contentType)
            ? "image/jpeg"
            : contentType.Split(';', 2)[0].Trim();
        if (string.Equals(normalizedType, "image/jpg", StringComparison.OrdinalIgnoreCase))
            normalizedType = "image/jpeg";

        if (!AllowedContentTypes.Contains(normalizedType))
            throw new InvalidOperationException(
                "Desteklenen formatlar: JPEG, PNG, WebP.");

        var safeName = Path.GetFileName(string.IsNullOrWhiteSpace(originalFileName) ? "photo.jpg" : originalFileName);
        var ext = Path.GetExtension(safeName);
        if (string.IsNullOrWhiteSpace(ext))
        {
            ext = normalizedType switch
            {
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => ".jpg"
            };
        }

        var folder = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "tasks", taskId.ToString("N"));
        Directory.CreateDirectory(folder);

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(folder, storedName);
        await using (var fs = File.Create(fullPath))
            await content.CopyToAsync(fs);

        if (new FileInfo(fullPath).Length == 0)
        {
            File.Delete(fullPath);
            throw new InvalidOperationException("Boş fotoğraf dosyası kabul edilmez.");
        }

        var storageKey = $"uploads/tasks/{taskId:N}/{storedName}";
        return new SavedTaskPhoto(storageKey, safeName, normalizedType);
    }
}
