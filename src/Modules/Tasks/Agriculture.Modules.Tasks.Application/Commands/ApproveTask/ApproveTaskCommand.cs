using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application.Commands.ApproveTask;

public sealed record ApproveTaskCommand(Guid TaskId) : ICommand;

internal sealed class ApproveTaskCommandHandler(ITaskRepository repository, IUnitOfWork uow)
    : ICommandHandler<ApproveTaskCommand>
{
    public async Task<Result> Handle(ApproveTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure(new Error("Task.NotFound", "Görev bulunamadı."));

        try
        {
            task.Approve();
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
