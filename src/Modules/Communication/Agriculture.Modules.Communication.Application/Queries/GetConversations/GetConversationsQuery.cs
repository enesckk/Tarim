using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Communication.Application.Queries.GetConversations;

public sealed record ConversationListItemDto(
    Guid Id,
    string Subject,
    string? LastMessagePreview,
    DateTime? LastMessageAtUtc,
    ConversationStatus Status,
    ConversationType Type = ConversationType.Expert,
    Guid? LandId = null,
    Guid? OfficerUserId = null,
    Guid? AdminUserId = null,
    bool HasUnread = false);

public sealed record GetConversationsQuery(Guid UserId) : IQuery<IReadOnlyList<ConversationListItemDto>>;

internal sealed class GetConversationsQueryHandler(IConversationRepository repository)
    : IQueryHandler<GetConversationsQuery, IReadOnlyList<ConversationListItemDto>>
{
    public async Task<Result<IReadOnlyList<ConversationListItemDto>>> Handle(
        GetConversationsQuery request,
        CancellationToken cancellationToken)
    {
        var items = await repository.GetByParticipantAsync(request.UserId, cancellationToken);
        var dtos = items.Select(c => Map(c, request.UserId)).ToList();
        return Result.Success<IReadOnlyList<ConversationListItemDto>>(dtos);
    }

    internal static ConversationListItemDto Map(Conversation c, Guid? viewerUserId = null)
    {
        var last = c.Messages.OrderByDescending(m => m.SentAtUtc).FirstOrDefault();
        var hasUnread = viewerUserId.HasValue
            && last is not null
            && last.SenderUserId != viewerUserId.Value;
        return new ConversationListItemDto(
            c.Id,
            c.Subject,
            last?.Body,
            c.LastMessageAtUtc ?? last?.SentAtUtc,
            c.Status,
            c.Type,
            c.LandId,
            c.OfficerUserId,
            c.AdminUserId,
            hasUnread);
    }
}
