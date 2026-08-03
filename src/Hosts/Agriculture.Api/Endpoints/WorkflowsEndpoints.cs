using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Application.Commands.AssignProductionWorkflow;
using Agriculture.Modules.Workflows.Application.Commands.CreateWorkflow;
using Agriculture.Modules.Workflows.Application.Commands.ReassignProductionProducer;
using Agriculture.Modules.Workflows.Application.Commands.UpdateWorkflow;
using Agriculture.Modules.Workflows.Application.Queries.GetWorkflows;
using Agriculture.Modules.Workflows.Domain.Entities;
using MediatR;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.EntityFrameworkCore;
using Agriculture.Application.Abstractions.Caching;

internal static class WorkflowsEndpoints
{
    public static RouteGroupBuilder MapWorkflowsEndpoints(this RouteGroupBuilder api)
    {
        // Workflows
        var workflows = api.MapGroup("/workflows").WithTags("Workflows").RequireAuthorization();
        // Templates: staff only (admin manages; officer needs list for land assign). Never producers.
        workflows.MapGet("/", async (ISender sender) => ApiResults.From(await sender.Send(new GetWorkflowsQuery())))
            .RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
        // Template create/edit: admin only. Officers list + assign to lands only.
        workflows.MapPost("/", async (CreateWorkflowCommand command, ISender sender, ICacheService cache) =>
        {
            var result = await sender.Send(command);
            if (result.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        workflows.MapPost("/media", async (HttpRequest request, IWebHostEnvironment env) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest(new { Code = "Media.Invalid", Message = "Dosya gerekli." });
            var file = request.Form.Files.GetFile("file") ?? request.Form.Files.FirstOrDefault();
            if (file is null || file.Length == 0)
                return Results.BadRequest(new { Code = "Media.Empty", Message = "Dosya boş." });

            var allowed = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
            var contentType = file.ContentType;
            if (string.IsNullOrWhiteSpace(contentType) || !allowed.Contains(contentType))
                return Results.BadRequest(new { Code = "Media.Type", Message = "Yalnızca görsel (jpg/png/webp) yükleyin." });

            var folder = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "guidance");
            Directory.CreateDirectory(folder);
            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext))
                ext = contentType switch
                {
                    "image/png" => ".png",
                    "image/webp" => ".webp",
                    "image/gif" => ".gif",
                    _ => ".jpg"
                };
            var storedName = $"{Guid.NewGuid():N}{ext}";
            var path = Path.Combine(folder, storedName);
            await using (var stream = File.Create(path))
                await file.CopyToAsync(stream);

            var storageKey = $"uploads/guidance/{storedName}";
            return Results.Ok(new { storageKey, url = UploadPathResolver.ToApiPath(storageKey) });
        }).DisableAntiforgery()
          .RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        workflows.MapPut("/{id:guid}", async (
            Guid id,
            UpdateWorkflowBody body,
            ISender sender,
            AgricultureDbContext db,
            ICacheService cache) =>
        {
            var result = await sender.Send(new UpdateWorkflowCommand(
                id, body.Name, body.Description, body.CropType, body.Steps));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            // Propagate guidance (note/video/image) to open tasks for this workflow.
            var workflow = await db.Workflows.AsNoTracking()
                .Include(w => w.Steps)
                .FirstOrDefaultAsync(w => w.Id == id);
            if (workflow is not null)
            {
                var productionIds = await db.ProductionWorkflows.AsNoTracking()
                    .Where(p => p.WorkflowId == id
                        && p.Status != ProductionWorkflowStatus.Cancelled
                        && p.Status != ProductionWorkflowStatus.Completed)
                    .Select(p => p.Id)
                    .ToListAsync();

                if (productionIds.Count > 0)
                {
                    // Do not sync AwaitingApproval / Completed / Cancelled — freeze submitted & closed work.
                    var openStatuses = new[]
                    {
                        ProductionTaskStatus.Pending,
                        ProductionTaskStatus.InProgress,
                        ProductionTaskStatus.Overdue,
                        ProductionTaskStatus.NeedsRevision
                    };
                    var openTasks = await db.Tasks
                        .Where(t => productionIds.Contains(t.ProductionWorkflowId)
                            && openStatuses.Contains(t.Status)
                            && !t.IsDeleted)
                        .ToListAsync();

                    var stepsById = workflow.Steps.ToDictionary(s => s.Id);
                    var stepsByName = workflow.Steps
                        .GroupBy(s => s.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                        .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

                    foreach (var task in openTasks)
                    {
                        WorkflowStep? step = null;
                        if (task.WorkflowStepId is Guid stepId && stepsById.TryGetValue(stepId, out var byId))
                            step = byId;
                        else if (stepsByName.TryGetValue(task.Title.Trim(), out var byName))
                            step = byName;
                        else if (workflow.Steps.Count == 1)
                            step = workflow.Steps.First();

                        if (step is null)
                            continue;

                        task.SyncFromWorkflowStep(
                            step.Description,
                            step.VideoUrl,
                            step.ImageUrl,
                            step.RequiresPhoto,
                            step.RequiresQuantity,
                            step.RequiresDate,
                            step.QuantityUnit,
                            step.Theme,
                            step.PlannedEvidenceJson,
                            step.Id);
                    }

                    await db.SaveChangesAsync();
                    await DashboardCache.InvalidateAsync(cache);
                }
            }

            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        workflows.MapPost("/assign", async (
            AssignProductionWorkflowCommand command,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db,
            ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            // Admin: any land. Officer: only assigned lands (must not be blocked from land-hub flow).
            if (user.Roles.Contains(AppRoles.Officer)
                && !user.Roles.Contains(AppRoles.Administrator))
            {
                var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == command.LandId);
                if (land is null)
                    return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });
                if (land.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            var result = await sender.Send(command);
            if (!result.IsSuccess)
                return ApiResults.From(result);

            // Critical linkage: assignment must materialize producer tasks from workflow steps.
            var workflow = await db.Workflows.AsNoTracking()
                .Include(w => w.Steps)
                .FirstOrDefaultAsync(w => w.Id == command.WorkflowId);
            if (workflow is not null && workflow.Steps.Count > 0)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var tasksToCreate = workflow.Steps
                    .OrderBy(s => s.Order)
                    .Select(step => ProductionTask.Create(
                        result.Value,
                        command.ProducerId,
                        command.LandId,
                        step.Name,
                        step.Description,
                        step.Id,
                        step.DueDaysFromStart is int days ? today.AddDays(days) : today,
                        step.RequiresPhoto,
                        step.RequiresQuantity,
                        step.RequiresDate,
                        step.QuantityUnit,
                        step.VideoUrl,
                        step.ImageUrl,
                        step.Theme,
                        step.PlannedEvidenceJson))
                    .ToList();
                await db.Tasks.AddRangeAsync(tasksToCreate);
                await db.SaveChangesAsync();

                // Keep land's current producer in sync with this production (SDS-R15).
                var land = await db.Lands.FirstOrDefaultAsync(l => l.Id == command.LandId);
                if (land is not null)
                {
                    land.AssignProducer(command.ProducerId);
                    await db.SaveChangesAsync();
                }
            }

            await DashboardCache.InvalidateAsync(cache);
            return Results.Ok(result.Value);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        workflows.MapPut("/productions/{id:guid}/producer", async (
            Guid id,
            ReassignProductionProducerBody body,
            IUserContext user,
            ISender sender,
            AgricultureDbContext db,
            ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var productionGate = await db.ProductionWorkflows.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
            if (productionGate is null)
                return Results.NotFound(new { Code = "Production.NotFound", Message = "Üretim planı bulunamadı." });

            if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator))
            {
                var landGate = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == productionGate.LandId);
                if (landGate is null || landGate.AssignedOfficerUserId != user.UserId)
                    return Results.Forbid();
            }

            var result = await sender.Send(new ReassignProductionProducerCommand(id, body.ProducerId));
            if (!result.IsSuccess)
                return ApiResults.From(result);

            var production = await db.ProductionWorkflows.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
            if (production is not null)
            {
                var openTasks = await db.Tasks
                    .Where(t => t.ProductionWorkflowId == id
                        && (t.Status == ProductionTaskStatus.Pending
                            || t.Status == ProductionTaskStatus.InProgress
                            || t.Status == ProductionTaskStatus.Overdue))
                    .ToListAsync();
                foreach (var task in openTasks)
                    task.ReassignProducer(body.ProducerId);

                var land = await db.Lands.FirstOrDefaultAsync(l => l.Id == production.LandId);
                land?.AssignProducer(body.ProducerId);

                await db.SaveChangesAsync();
            }

            await DashboardCache.InvalidateAsync(cache);
            return Results.Ok();
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

        return api;
    }
}

internal sealed record UpdateWorkflowBody(
    string Name,
    string? Description,
    string? CropType,
    IReadOnlyList<Agriculture.Modules.Workflows.Application.Commands.CreateWorkflow.WorkflowStepInput> Steps);
internal sealed record ReassignProductionProducerBody(Guid ProducerId);
