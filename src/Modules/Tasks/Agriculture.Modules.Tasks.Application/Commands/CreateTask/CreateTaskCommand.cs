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
    string? QuantityUnit = null) : ICommand<Guid>;

public sealed class CreateTaskCommandValidator : AbstractValidator<CreateTaskCommand>
{
    public CreateTaskCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.ProducerId).NotEmpty();
        RuleFor(x => x.ProductionWorkflowId).NotEmpty();
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
        var task = ProductionTask.Create(
            request.ProductionWorkflowId,
            request.ProducerId,
            request.LandId,
            request.Title,
            request.Description,
            request.WorkflowStepId,
            request.DueDate,
            request.RequiresPhoto,
            request.RequiresQuantity,
            request.RequiresDate,
            request.QuantityUnit);

        await repository.AddAsync(task, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(task.Id);
    }
}
