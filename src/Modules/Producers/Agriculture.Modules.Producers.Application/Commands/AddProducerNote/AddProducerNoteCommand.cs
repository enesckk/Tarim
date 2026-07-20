using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Producers.Application.Commands.AddProducerNote;

public sealed record AddProducerNoteCommand(Guid ProducerId, Guid AuthorUserId, string Body) : ICommand<Guid>;

public sealed class AddProducerNoteCommandValidator : AbstractValidator<AddProducerNoteCommand>
{
    public AddProducerNoteCommandValidator()
    {
        RuleFor(x => x.ProducerId).NotEmpty();
        RuleFor(x => x.AuthorUserId).NotEmpty();
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

internal sealed class AddProducerNoteCommandHandler(
    IProducerRepository producers,
    IProducerNoteRepository notes,
    IUnitOfWork uow) : ICommandHandler<AddProducerNoteCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AddProducerNoteCommand request, CancellationToken cancellationToken)
    {
        var producer = await producers.GetByIdAsync(request.ProducerId, cancellationToken);
        if (producer is null)
            return Result.Failure<Guid>(new Error("Producer.NotFound", "Üretici bulunamadı."));

        var note = ProducerNote.Create(request.ProducerId, request.AuthorUserId, request.Body);
        await notes.AddAsync(note, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(note.Id);
    }
}
