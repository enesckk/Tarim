using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.Modules.Workflows.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Workflows.Application.Queries.GetLandProductions;

public sealed record LandProductionDto(
    Guid Id,
    Guid LandId,
    Guid SeasonId,
    Guid WorkflowId,
    string WorkflowName,
    string? CropType,
    Guid ProducerId,
    ProductionWorkflowStatus Status,
    int CurrentStepOrder,
    int StepCount,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc);

public sealed record GetLandProductionsQuery(Guid LandId) : IQuery<IReadOnlyList<LandProductionDto>>;

public sealed class GetLandProductionsQueryValidator : AbstractValidator<GetLandProductionsQuery>
{
    public GetLandProductionsQueryValidator()
    {
        RuleFor(x => x.LandId).NotEmpty();
    }
}

internal sealed class GetLandProductionsQueryHandler(
    IProductionWorkflowRepository productionRepository,
    IWorkflowRepository workflowRepository)
    : IQueryHandler<GetLandProductionsQuery, IReadOnlyList<LandProductionDto>>
{
    public async Task<Result<IReadOnlyList<LandProductionDto>>> Handle(
        GetLandProductionsQuery request,
        CancellationToken cancellationToken)
    {
        var productions = await productionRepository.GetByLandIdAsync(request.LandId, cancellationToken);
        if (productions.Count == 0)
            return Result.Success<IReadOnlyList<LandProductionDto>>([]);

        var workflows = await workflowRepository.GetAllAsync(cancellationToken);
        var byId = workflows.ToDictionary(w => w.Id);

        var dtos = productions.Select(p =>
        {
            byId.TryGetValue(p.WorkflowId, out var workflow);
            return new LandProductionDto(
                p.Id,
                p.LandId,
                p.SeasonId,
                p.WorkflowId,
                workflow?.Name ?? "—",
                workflow?.CropType,
                p.ProducerId,
                p.Status,
                p.CurrentStepOrder,
                workflow?.Steps.Count ?? 0,
                p.StartedAtUtc,
                p.CompletedAtUtc);
        }).ToList();

        return Result.Success<IReadOnlyList<LandProductionDto>>(dtos);
    }
}
