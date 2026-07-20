using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.Modules.Tasks.Application.Queries.GetTasks;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application.Queries.GetTodayTasks;

public sealed record GetTodayTasksQuery(Guid ProducerId) : IQuery<IReadOnlyList<TaskDto>>;

internal sealed class GetTodayTasksQueryHandler(ITaskRepository repository)
    : IQueryHandler<GetTodayTasksQuery, IReadOnlyList<TaskDto>>
{
    public async Task<Result<IReadOnlyList<TaskDto>>> Handle(
        GetTodayTasksQuery request,
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var tasks = await repository.GetByProducerAsync(request.ProducerId, cancellationToken);

        var open = tasks
            .Where(t => t.Status is ProductionTaskStatus.Pending
                or ProductionTaskStatus.InProgress
                or ProductionTaskStatus.Overdue)
            .Where(t => t.DueDate is null || t.DueDate <= today)
            .OrderBy(t => t.DueDate ?? DateOnly.MaxValue)
            .ThenBy(t => t.Title)
            .Select(TaskDtoMapper.ToDto)
            .ToList();

        return Result.Success<IReadOnlyList<TaskDto>>(open);
    }
}
