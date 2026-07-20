using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.Modules.Workflows.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Workflows.Application.Queries.GetWorkflows;

public sealed record WorkflowStepDto(
    Guid Id,
    string Name,
    string? Description,
    int Order,
    int? DueDaysFromStart,
    bool RequiresPhoto,
    bool RequiresQuantity,
    bool RequiresDate,
    string? QuantityUnit);

public sealed record WorkflowDto(
    Guid Id,
    string Name,
    string? Description,
    string? CropType,
    WorkflowStatus Status,
    IReadOnlyList<WorkflowStepDto> Steps);

public sealed record GetWorkflowsQuery : IQuery<IReadOnlyList<WorkflowDto>>;

internal sealed class GetWorkflowsQueryHandler(IWorkflowRepository repository)
    : IQueryHandler<GetWorkflowsQuery, IReadOnlyList<WorkflowDto>>
{
    public async Task<Result<IReadOnlyList<WorkflowDto>>> Handle(GetWorkflowsQuery request, CancellationToken cancellationToken)
    {
        var workflows = await repository.GetAllAsync(cancellationToken);
        var dtos = workflows.Select(w => new WorkflowDto(
            w.Id, w.Name, w.Description, w.CropType, w.Status,
            w.Steps
                .OrderBy(s => s.Order)
                .Select(s => new WorkflowStepDto(
                    s.Id,
                    s.Name,
                    s.Description,
                    s.Order,
                    s.DueDaysFromStart,
                    s.RequiresPhoto,
                    s.RequiresQuantity,
                    s.RequiresDate,
                    s.QuantityUnit))
                .ToList()
        )).ToList();
        return Result.Success<IReadOnlyList<WorkflowDto>>(dtos);
    }
}
