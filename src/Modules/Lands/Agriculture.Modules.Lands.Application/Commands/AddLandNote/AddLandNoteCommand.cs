using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Lands.Application.Commands.AddLandNote;

public sealed record AddLandNoteCommand(Guid LandId, Guid AuthorUserId, string Body) : ICommand<Guid>;

public sealed class AddLandNoteCommandValidator : AbstractValidator<AddLandNoteCommand>
{
    public AddLandNoteCommandValidator()
    {
        RuleFor(x => x.LandId).NotEmpty();
        RuleFor(x => x.AuthorUserId).NotEmpty();
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

internal sealed class AddLandNoteCommandHandler(
    ILandRepository lands,
    ILandNoteRepository notes,
    IUnitOfWork uow) : ICommandHandler<AddLandNoteCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddLandNoteCommand request, CancellationToken cancellationToken)
    {
        var land = await lands.GetByIdAsync(request.LandId, cancellationToken);
        if (land is null)
            return Result.Failure<Guid>(new Error("Land.NotFound", "Arazi bulunamadı."));

        var note = LandNote.Create(request.LandId, request.AuthorUserId, request.Body);
        await notes.AddAsync(note, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(note.Id);
    }
}
