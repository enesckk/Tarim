using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.Modules.Workflows.Application.Commands.CreateWorkflow;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Workflows.Application.Commands.UpdateWorkflow;

public sealed record UpdateWorkflowCommand(
    Guid Id,
    string Name,
    string? Description,
    string? CropType,
    IReadOnlyList<WorkflowStepInput> Steps) : ICommand;

public sealed class UpdateWorkflowCommandValidator : AbstractValidator<UpdateWorkflowCommand>
{
    public UpdateWorkflowCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Steps).NotEmpty().WithMessage("En az bir adım gerekli.");
        RuleForEach(x => x.Steps).ChildRules(step =>
        {
            step.RuleFor(s => s.Name).NotEmpty().MaximumLength(200);
            step.RuleFor(s => s.Order).GreaterThan(0);
            step.RuleFor(s => s.DueDaysFromStart)
                .GreaterThanOrEqualTo(0)
                .When(s => s.DueDaysFromStart.HasValue);
            step.RuleFor(s => s.QuantityUnit)
                .NotEmpty()
                .MaximumLength(32)
                .When(s => s.RequiresQuantity);
        });
        RuleFor(x => x.Steps)
            .Must(steps => steps.Select(s => s.Order).Distinct().Count() == steps.Count)
            .WithMessage("Adım sıraları benzersiz olmalıdır.");
        RuleFor(x => x.Steps)
            .Must(AreDueDaysNonDecreasing)
            .WithMessage("Adım günleri sıralamada geriye gidemez (başlangıçtan gün artmalı veya eşit kalmalı).");
    }

    private static bool AreDueDaysNonDecreasing(IReadOnlyList<WorkflowStepInput> steps)
    {
        int? previous = null;
        foreach (var step in steps.OrderBy(s => s.Order))
        {
            var day = step.DueDaysFromStart ?? 0;
            if (previous is int p && day < p)
                return false;
            previous = day;
        }

        return true;
    }
}

internal sealed class UpdateWorkflowCommandHandler(IWorkflowRepository repository, IUnitOfWork uow)
    : ICommandHandler<UpdateWorkflowCommand>
{
    public async Task<Result> Handle(UpdateWorkflowCommand request, CancellationToken cancellationToken)
    {
        var workflow = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (workflow is null)
            return Result.Failure(new Error("Workflow.NotFound", "İş akışı bulunamadı."));

        workflow.UpdateDetails(request.Name, request.Description, request.CropType);
        workflow.ClearSteps();
        foreach (var step in request.Steps.OrderBy(s => s.Order))
        {
            workflow.AddStep(
                step.Name,
                step.Description,
                step.Order,
                step.DueDaysFromStart,
                step.RequiresPhoto,
                step.RequiresQuantity,
                step.RequiresDate,
                step.QuantityUnit);
        }

        repository.Update(workflow);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
