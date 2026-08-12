using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application;
using Agriculture.Modules.Tasks.Domain.Entities;
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
            step.RuleFor(s => s.VideoUrl)
                .MaximumLength(500)
                .Must(BeValidHttpUrl)
                .WithMessage("Eğitim videosu bağlantısı http:// veya https:// ile başlamalıdır.");
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

    private static bool BeValidHttpUrl(string? value) =>
        string.IsNullOrWhiteSpace(value)
        || (Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps));
}

internal sealed class UpdateWorkflowCommandHandler(IWorkflowRepository repository, IUnitOfWork uow)
    : ICommandHandler<UpdateWorkflowCommand>
{
    public async Task<Result> Handle(UpdateWorkflowCommand request, CancellationToken cancellationToken)
    {
        var workflow = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (workflow is null)
            return Result.Failure(new Error("Workflow.NotFound", "İş akışı bulunamadı."));

        foreach (var step in request.Steps)
        {
            if (string.IsNullOrWhiteSpace(step.Theme))
                continue;
            if (!TaskThemes.TryNormalize(step.Theme, out var theme))
                return Result.Failure(new Error("Task.InvalidTheme", "Geçersiz işlem teması."));
            var planned = TaskEvidenceHelper.ValidatePlanned(theme, step.PlannedEvidence);
            if (!planned.IsSuccess)
                return Result.Failure(planned.Error!);
        }

        workflow.UpdateDetails(request.Name, request.Description, request.CropType);
        var removed = workflow.SyncSteps(
            request.Steps.Select(step =>
            {
                string? theme = null;
                string? plannedJson = null;
                var requiresPhoto = step.RequiresPhoto;
                if (!string.IsNullOrWhiteSpace(step.Theme) && TaskThemes.TryNormalize(step.Theme, out var t))
                {
                    theme = t;
                    TaskThemes.ApplyCreateDefaults(t, out requiresPhoto);
                    if (step.PlannedEvidence is not null)
                        plannedJson = TaskEvidenceHelper.ToJson(step.PlannedEvidence);
                }

                return (
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
            }).ToList());

        repository.Update(workflow, removed);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
