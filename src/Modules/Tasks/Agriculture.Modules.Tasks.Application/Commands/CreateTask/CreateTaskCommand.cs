using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Tasks.Application.Commands.CreateTask;

public sealed record CreateTaskCommand(
    Guid ProductionWorkflowId,
    Guid ProducerId,
    Guid LandId,
    string Title,
    string? Description,
    Guid? WorkflowStepId,
    DateOnly? DueDate,
    bool RequiresPhoto,
    bool RequiresQuantity = false,
    bool RequiresDate = false,
    string? QuantityUnit = null,
    string? VideoUrl = null,
    string? ImageUrl = null,
    string? Theme = null,
    TaskEvidenceDto? PlannedEvidence = null) : ICommand<Guid>;

public sealed class CreateTaskCommandValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ProducerId).NotEmpty();
        RuleFor(x => x.ProductionWorkflowId).NotEmpty();
        RuleFor(x => x.Theme)
            .NotEmpty()
            .WithMessage("İşlem teması gerekli.")
            .Must(t => TaskThemes.TryNormalize(t, out _))
            .WithMessage("Geçerli bir işlem teması seçin (Sulama, Gübreleme, İlaçlama, Dikim, Hasat, Bakım).");
        RuleFor(x => x.QuantityUnit)
            .NotEmpty()
            .MaximumLength(32)
            .When(x => x.RequiresQuantity);
    }
}

internal sealed class CreateTaskCommandHandler(ITaskRepository repository, IUnitOfWork uow)
    : ICommandHandler<CreateTaskCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateTaskCommand request, CancellationToken cancellationToken)
    {
        if (!TaskThemes.TryNormalize(request.Theme, out var theme))
            return Result.Failure<Guid>(new Error("Task.InvalidTheme", "Geçersiz işlem teması."));

        var plannedCheck = TaskEvidenceHelper.ValidatePlanned(theme, request.PlannedEvidence);
        if (!plannedCheck.IsSuccess)
            return Result.Failure<Guid>(plannedCheck.Error!);

        TaskThemes.ApplyCreateDefaults(theme, out var requiresPhoto);
        var plannedJson = request.PlannedEvidence is null
            ? null
            : TaskEvidenceHelper.ToJson(request.PlannedEvidence);

        try
        {
            var task = ProductionTask.Create(
                request.ProductionWorkflowId,
                request.ProducerId,
                request.LandId,
                request.Title,
                request.Description,
                request.WorkflowStepId,
                request.DueDate,
                requiresPhoto,
                request.RequiresQuantity,
                request.RequiresDate,
                request.QuantityUnit,
                request.VideoUrl,
                request.ImageUrl,
                theme,
                plannedJson);

            await repository.AddAsync(task, cancellationToken);
            await uow.SaveChangesAsync(cancellationToken);
            return Result.Success(task.Id);
        }
        catch (ArgumentException ex)
        {
            return Result.Failure<Guid>(new Error("Task.InvalidTheme", ex.Message));
        }
    }
}
