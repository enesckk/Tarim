using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Communication.Application.Commands.SendMessage;

public sealed record SendMessageCommand(
    Guid ConversationId,
    Guid SenderUserId,
    string Body,
    bool StaffAccess = false) : ICommand<Guid>;

public sealed class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageCommandValidator()
    {
        RuleFor(x => x.ConversationId).NotEmpty();
        RuleFor(x => x.SenderUserId).NotEmpty();
        RuleFor(x => x.Body).NotEmpty().MaximumLength(4000);
    }
}

internal sealed class SendMessageCommandHandler(IConversationRepository repository, IUnitOfWork uow)
    : ICommandHandler<SendMessageCommand, Guid>
{
    public async Task<Result<Guid>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var conversation = await repository.GetByIdAsync(request.ConversationId, cancellationToken);
        if (conversation is null)
            return Result.Failure<Guid>(new Error("Conversation.NotFound", "Conversation was not found."));

        if (conversation.Status == Domain.Entities.ConversationStatus.Closed)
            return Result.Failure<Guid>(new Error("Conversation.Closed", "Conversation is closed."));

        if (!request.StaffAccess && !conversation.IsParticipant(request.SenderUserId))
            return Result.Failure<Guid>(new Error("Conversation.Forbidden", "You are not a participant."));

        var message = conversation.AddMessage(request.SenderUserId, request.Body);
        repository.MarkMessageAdded(message);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(message.Id);
    }
}
