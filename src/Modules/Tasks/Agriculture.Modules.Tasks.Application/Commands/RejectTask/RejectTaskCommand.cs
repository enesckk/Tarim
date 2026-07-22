using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Tasks.Application.Commands.RejectTask;

public sealed record RejectTaskCommand(Guid TaskId, string Reason) : ICommand;

public sealed class RejectTaskCommandValidator : AbstractValidator<RejectTaskCommand>
{
    public RejectTaskCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(1000);
    }
}

internal sealed class RejectTaskCommandHandler(ITaskRepository repository, IUnitOfWork uow)
    : ICommandHandler<RejectTaskCommand>
{
    public async Task<Result> Handle(RejectTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure(new Error("Task.NotFound", "Görev bulunamadı."));

        try
        {
            task.RequestRevision(request.Reason);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure(new Error("Task.InvalidState", ex.Message));
        }

        repository.Update(task);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
