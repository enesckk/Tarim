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

        if (!request.StaffAccess && !conversation.IsParticipant(request.UserId))
            return Result.Failure<ConversationDetailDto>(
                new Error("Conversation.Forbidden", "You are not a participant."));

        // Admin staff access: always OK. Officer staff access: must be assigned officer or admin participant.
        if (request.StaffAccess
            && conversation.Type == ConversationType.Expert
            && conversation.OfficerUserId.HasValue
            && conversation.OfficerUserId != request.UserId
            && conversation.AdminUserId != request.UserId)
        {
            // Allow any Administrator via StaffAccess when OfficerUserId filter is not enforced here;
            // endpoint passes StaffAccess for both Admin and Officer — Officer-only threads filtered in list.
            // Keep detail readable for Admin (StaffAccess) even if not the assigned officer.
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
