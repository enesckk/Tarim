using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.Modules.Tasks.Application.Queries.GetTasks;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application.Queries.GetTaskById;

public sealed record GetTaskByIdQuery(Guid TaskId) : IQuery<TaskDto>;

internal sealed class GetTaskByIdQueryHandler(ITaskRepository repository)
    : IQueryHandler<GetTaskByIdQuery, TaskDto>
{
    public async Task<Result<TaskDto>> Handle(GetTaskByIdQuery request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure<TaskDto>(new Error("Task.NotFound", "Task was not found."));

        return Result.Success(TaskDtoMapper.ToDto(task));
    }
}
