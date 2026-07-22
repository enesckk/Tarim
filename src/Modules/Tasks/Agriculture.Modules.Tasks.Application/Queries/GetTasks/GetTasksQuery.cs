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
    string? VideoUrl,
    string? ImageUrl,
    string? RevisionReason,
    DateTime? CompletedAtUtc,
    int PhotoCount,
    IReadOnlyList<TaskPhotoDto> Photos);

public sealed record GetTasksQuery(Guid? ProducerId = null) : IQuery<IReadOnlyList<TaskDto>>;

internal sealed class GetTasksQueryHandler(ITaskRepository repository)
    : IQueryHandler<GetTasksQuery, IReadOnlyList<TaskDto>>
{
    public async Task<Result<IReadOnlyList<TaskDto>>> Handle(GetTasksQuery request, CancellationToken cancellationToken)
    {
        var tasks = request.ProducerId.HasValue
            ? await repository.GetByProducerAsync(request.ProducerId.Value, cancellationToken)
            : await repository.GetAllAsync(cancellationToken);

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
        t.VideoUrl,
        t.ImageUrl,
        t.RevisionReason,
        t.CompletedAtUtc,
        t.Photos.Count,
        t.Photos
            .OrderByDescending(p => p.UploadedAtUtc)
            .Select(p => new TaskPhotoDto(p.Id, p.StorageKey, p.FileName, p.ContentType, p.UploadedAtUtc))
            .ToList());
}
