using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Communication.Application.Queries.GetConversationMessages;

public sealed record ChatMessageDto(Guid Id, Guid SenderUserId, string Body, DateTime SentAtUtc);

public sealed record ConversationDetailDto(
    Guid Id,
    string Subject,
    Guid ProducerUserId,
    Guid? OfficerUserId,
    IReadOnlyList<ChatMessageDto> Messages,
    ConversationType Type = ConversationType.Expert,
    Guid? LandId = null,
    Guid? AdminUserId = null);

public sealed record GetConversationMessagesQuery(
    Guid ConversationId,
    Guid UserId,
    bool StaffAccess = false) : IQuery<ConversationDetailDto>;

internal sealed class GetConversationMessagesQueryHandler(IConversationRepository repository)
    : IQueryHandler<GetConversationMessagesQuery, ConversationDetailDto>
{
    public async Task<Result<ConversationDetailDto>> Handle(
        GetConversationMessagesQuery request,
        CancellationToken cancellationToken)
    {
        var conversation = await repository.GetByIdAsync(request.ConversationId, cancellationToken);
        if (conversation is null)
            return Result.Failure<ConversationDetailDto>(
                new Error("Conversation.NotFound", "Conversation was not found."));

        if (!conversation.IsParticipant(request.UserId) && !request.StaffAccess)
            return Result.Failure<ConversationDetailDto>(
                new Error("Conversation.Forbidden", "You are not a participant."));

        // StaffAccess is Admin-only bypass (set at endpoint). Officers must be participants.
        if (request.StaffAccess
            && conversation.Type == ConversationType.Expert
            && conversation.OfficerUserId.HasValue
            && conversation.OfficerUserId != request.UserId)
        {
            // Admin may open any expert thread; non-admin StaffAccess should not occur.
        }

        var messages = conversation.Messages
            .OrderBy(m => m.SentAtUtc)
            .Select(m => new ChatMessageDto(m.Id, m.SenderUserId, m.Body, m.SentAtUtc))
            .ToList();

        return Result.Success(new ConversationDetailDto(
            conversation.Id,
            conversation.Subject,
            conversation.ProducerUserId,
            conversation.OfficerUserId,
            messages,
            conversation.Type,
            conversation.LandId,
            conversation.AdminUserId));
    }
}
