using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application.Commands.CompleteTask;

public sealed record CompleteTaskCommand(Guid TaskId, string? Notes) : ICommand;

internal sealed class CompleteTaskCommandHandler(ITaskRepository repository, IUnitOfWork uow)
    : ICommandHandler<CompleteTaskCommand>
{
    public async Task<Result> Handle(CompleteTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure(new Error("Task.NotFound", "Task was not found."));

        try
        {
            task.Complete(request.Notes);
        }
        catch (InvalidOperationException ex)
        {
            var message = ex.Message.Contains("Photo", StringComparison.OrdinalIgnoreCase)
                ? "Bu görevi göndermek için önce fotoğraf yükleyin."
                : ex.Message;
            return Result.Failure(new Error("Task.InvalidState", message));
        }

        repository.Update(task);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
