using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.Modules.Workflows.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Workflows.Application.Commands.CreateWorkflow;

public sealed record WorkflowStepInput(
    string Name,
    string? Description,
    int Order,
    int? DueDaysFromStart,
    bool RequiresPhoto,
    bool RequiresQuantity = false,
    bool RequiresDate = false,
    string? QuantityUnit = null,
    string? VideoUrl = null,
    string? ImageUrl = null,
    string? Theme = null,
    TaskEvidenceDto? PlannedEvidence = null);

public sealed record CreateWorkflowCommand(
    string Name,
    string? Description,
    string? CropType,
    IReadOnlyList<WorkflowStepInput> Steps) : ICommand<Guid>;

public sealed class CreateWorkflowCommandValidator : AbstractValidator<CreateWorkflowCommand>
{
    public CreateWorkflowCommandValidator()
    {
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
            step.RuleFor(s => s.VideoUrl).MaximumLength(500);
            step.RuleFor(s => s.ImageUrl).MaximumLength(500);
            step.RuleFor(s => s.Theme)
                .Must(t => string.IsNullOrWhiteSpace(t) || TaskThemes.TryNormalize(t, out _))
                .WithMessage("Geçerli bir işlem teması seçin.");
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

internal sealed class CreateWorkflowCommandHandler(IWorkflowRepository repository, IUnitOfWork uow)
    : ICommandHandler<CreateWorkflowCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateWorkflowCommand request, CancellationToken cancellationToken)
    {
        foreach (var step in request.Steps)
        {
            if (string.IsNullOrWhiteSpace(step.Theme))
                continue;
            if (!TaskThemes.TryNormalize(step.Theme, out var theme))
                return Result.Failure<Guid>(new Error("Task.InvalidTheme", "Geçersiz işlem teması."));
            var planned = TaskEvidenceHelper.ValidatePlanned(theme, step.PlannedEvidence);
            if (!planned.IsSuccess)
                return Result.Failure<Guid>(planned.Error!);
        }

        var workflow = Workflow.Create(request.Name, request.Description, request.CropType);
        foreach (var step in request.Steps.OrderBy(s => s.Order))
        {
            string? theme = null;
            string? plannedJson = null;
            if (!string.IsNullOrWhiteSpace(step.Theme) && TaskThemes.TryNormalize(step.Theme, out var t))
            {
                theme = t;
                TaskThemes.ApplyCreateDefaults(t, out _);
                if (step.PlannedEvidence is not null)
                    plannedJson = TaskEvidenceHelper.ToJson(step.PlannedEvidence);
            }

            var requiresPhoto = step.RequiresPhoto;
            if (theme is not null)
                TaskThemes.ApplyCreateDefaults(theme, out requiresPhoto);

            workflow.AddStep(
                step.Name,
                step.Description,
                step.Order,
                step.DueDaysFromStart,
                requiresPhoto,
                step.RequiresQuantity,
                step.RequiresDate,
                step.QuantityUnit,
                step.VideoUrl,
                step.ImageUrl,
                theme,
                plannedJson);
        }

        await repository.AddAsync(workflow, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(workflow.Id);
    }
}
