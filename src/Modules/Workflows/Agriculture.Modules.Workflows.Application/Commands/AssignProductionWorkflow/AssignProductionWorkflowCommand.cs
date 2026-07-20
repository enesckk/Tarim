using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.Modules.Workflows.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Workflows.Application.Commands.AssignProductionWorkflow;

public sealed record AssignProductionWorkflowCommand(
    Guid SeasonId,
    Guid WorkflowId,
    Guid ProducerId,
    Guid LandId) : ICommand<Guid>;

public sealed class AssignProductionWorkflowCommandValidator : AbstractValidator<AssignProductionWorkflowCommand>
{
    public AssignProductionWorkflowCommandValidator()
    {
        RuleFor(x => x.SeasonId).NotEmpty();
        RuleFor(x => x.WorkflowId).NotEmpty();
        RuleFor(x => x.ProducerId).NotEmpty();
        RuleFor(x => x.LandId).NotEmpty();
    }
}

internal sealed class AssignProductionWorkflowCommandHandler(
    IWorkflowRepository workflowRepository,
    IProductionWorkflowRepository productionWorkflowRepository,
    IUnitOfWork uow) : ICommandHandler<AssignProductionWorkflowCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AssignProductionWorkflowCommand request, CancellationToken cancellationToken)
    {
        var workflow = await workflowRepository.GetByIdAsync(request.WorkflowId, cancellationToken);
        if (workflow is null)
            return Result.Failure<Guid>(new Error("Workflow.NotFound", "Workflow was not found."));

        var production = ProductionWorkflow.Assign(request.SeasonId, request.WorkflowId, request.ProducerId, request.LandId);
        production.Start();

        await productionWorkflowRepository.AddAsync(production, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(production.Id);
    }
}
