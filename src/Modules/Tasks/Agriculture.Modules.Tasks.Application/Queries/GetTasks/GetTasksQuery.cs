using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application.Queries.GetTasks;

public sealed record TaskPhotoDto(
    Guid Id,
    string StorageKey,
    string FileName,
    string ContentType,
    DateTime UploadedAtUtc);

public sealed record TaskDto(
    Guid Id,
    Guid ProducerId,
    Guid LandId,
    string Title,
    string? Description,
    DateOnly? DueDate,
    ProductionTaskStatus Status,
    bool RequiresPhoto,
    bool RequiresQuantity,
    bool RequiresDate,
    string? QuantityUnit,
    string? Theme,
    string? VideoUrl,
    string? ImageUrl,
    string? RevisionReason,
    string? CompletionNotes,
    string? PlannedEvidenceJson,
    string? EvidenceJson,
    DateTime? CompletedAtUtc,
    int PhotoCount,
    IReadOnlyList<TaskPhotoDto> Photos);

public sealed record GetTasksQuery(
    Guid? ProducerId = null,
    IReadOnlyList<Guid>? LandIds = null) : IQuery<IReadOnlyList<TaskDto>>;

internal sealed class GetTasksQueryHandler(ITaskRepository repository)
    : IQueryHandler<GetTasksQuery, IReadOnlyList<TaskDto>>
{
    public async Task<Result<IReadOnlyList<TaskDto>>> Handle(GetTasksQuery request, CancellationToken cancellationToken)
    {
        IReadOnlyList<ProductionTask> tasks;
        if (request.LandIds is not null)
        {
            tasks = await repository.GetByLandIdsAsync(
                request.LandIds,
                request.ProducerId,
                cancellationToken);
        }
        else if (request.ProducerId.HasValue)
        {
            tasks = await repository.GetByProducerAsync(request.ProducerId.Value, cancellationToken);
        }
        else
        {
            tasks = await repository.GetAllAsync(cancellationToken);
        }

        var dtos = tasks.Select(TaskDtoMapper.ToDto).ToList();

        return Result.Success<IReadOnlyList<TaskDto>>(dtos);
    }
}

internal static class TaskDtoMapper
{
    public static TaskDto ToDto(ProductionTask t) => new(
        t.Id,
        t.ProducerId,
        t.LandId,
        t.Title,
        t.Description,
        t.DueDate,
        t.Status,
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
        t.Photos.Count,
        t.Photos
            .OrderByDescending(p => p.UploadedAtUtc)
            .Select(p => new TaskPhotoDto(p.Id, p.StorageKey, p.FileName, p.ContentType, p.UploadedAtUtc))
            .ToList());
}
