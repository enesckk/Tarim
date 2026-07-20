using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Communication.Application.Commands.AskExpert;

public sealed record AskExpertCommand(
    Guid ProducerUserId,
    string? Subject,
    Guid? OfficerUserId = null,
    Guid? LandId = null) : ICommand<Guid>;

public sealed class AskExpertCommandValidator : AbstractValidator<AskExpertCommand>
{
    public AskExpertCommandValidator()
    {
        RuleFor(x => x.ProducerUserId).NotEmpty();
        RuleFor(x => x.Subject).MaximumLength(200);
    }
}

internal sealed class AskExpertCommandHandler(IConversationRepository repository, IUnitOfWork uow)
    : ICommandHandler<AskExpertCommand, Guid>
{
    public async Task<Result<Guid>> Handle(AskExpertCommand request, CancellationToken cancellationToken)
    {
        var existing = await repository.GetOpenExpertThreadAsync(
            request.ProducerUserId, request.LandId, cancellationToken);
        if (existing is not null)
            return Result.Success(existing.Id);

        var conversation = Conversation.Create(
            request.ProducerUserId,
            request.Subject ?? "Genel soru",
            request.OfficerUserId,
            request.LandId);
        await repository.AddAsync(conversation, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(conversation.Id);
    }
}
