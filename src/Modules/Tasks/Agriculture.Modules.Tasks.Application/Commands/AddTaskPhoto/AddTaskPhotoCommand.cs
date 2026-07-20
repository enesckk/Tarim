using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Tasks.Application.Commands.AddTaskPhoto;

public sealed record AddTaskPhotoCommand(
    Guid TaskId,
    string StorageKey,
    string FileName,
    string ContentType) : ICommand;

public sealed class AddTaskPhotoCommandValidator : AbstractValidator<AddTaskPhotoCommand>
{
    public AddTaskPhotoCommandValidator()
    {
        RuleFor(x => x.TaskId).NotEmpty();
        RuleFor(x => x.StorageKey).NotEmpty().MaximumLength(500);
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(255);
        RuleFor(x => x.ContentType).NotEmpty().MaximumLength(100);
    }
}

internal sealed class AddTaskPhotoCommandHandler(ITaskRepository repository, IUnitOfWork uow)
    : ICommandHandler<AddTaskPhotoCommand>
{
    public async Task<Result> Handle(AddTaskPhotoCommand request, CancellationToken cancellationToken)
    {
        var task = await repository.GetByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
            return Result.Failure(new Error("Task.NotFound", "Task was not found."));

        var photo = task.AddPhoto(request.StorageKey, request.FileName, request.ContentType);
        repository.MarkPhotoAdded(photo);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
