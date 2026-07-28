using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application.Commands.CompleteTask;

public sealed record CompleteTaskCommand(
    Guid TaskId,
    string? Notes,
    TaskEvidenceDto? Evidence = null) : ICommand;

internal sealed class CompleteTaskCommandHandler(ITaskRepository repository, IUnitOfWork uow)
    : ICommandHandler<CompleteTaskCommand>
{
    public async Task<Result> Handle(CompleteTaskCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure(new Error("Task.NotFound", "Task was not found."));

        // Tema varsa yapılandırılmış kanıt zorunlu; teması olmayan eski görevlerde atlanır.
        if (!string.IsNullOrWhiteSpace(task.Theme))
        {
            var evidenceCheck = TaskEvidenceHelper.Validate(task.Theme, request.Evidence);
            if (!evidenceCheck.IsSuccess)
                return evidenceCheck;
        }

        var evidenceJson = request.Evidence is null
            ? null
            : TaskEvidenceHelper.ToJson(request.Evidence);

        var notes = !string.IsNullOrWhiteSpace(task.Theme) && request.Evidence is not null
            ? TaskEvidenceHelper.FormatCompletionNotes(task.Theme, request.Evidence, request.Notes)
            : request.Notes;

        try
        {
            task.Complete(notes, evidenceJson);
        }
        catch (InvalidOperationException ex)
        {
            var message = ex.Message.Contains("Photo", StringComparison.OrdinalIgnoreCase)
                || ex.Message.Contains("fotoğraf", StringComparison.OrdinalIgnoreCase)
                ? (ex.Message.Contains("2 fotoğraf", StringComparison.Ordinal)
                    ? ex.Message
                    : "Bu görevi göndermek için önce fotoğraf yükleyin.")
                : ex.Message;
            return Result.Failure(new Error("Task.InvalidState", message));
        }

        repository.Update(task);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
