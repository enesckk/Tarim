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
    Guid? AdminUserId = null);

public sealed record GetConversationsQuery(Guid UserId) : IQuery<IReadOnlyList<ConversationListItemDto>>;

internal sealed class GetConversationsQueryHandler(IConversationRepository repository)
    : IQueryHandler<GetConversationsQuery, IReadOnlyList<ConversationListItemDto>>
{
    public async Task<Result<IReadOnlyList<ConversationListItemDto>>> Handle(
        GetConversationsQuery request,
        CancellationToken cancellationToken)
    {
        var items = await repository.GetByParticipantAsync(request.UserId, cancellationToken);
        var dtos = items.Select(Map).ToList();
        return Result.Success<IReadOnlyList<ConversationListItemDto>>(dtos);
    }

    internal static ConversationListItemDto Map(Conversation c)
    {
        var last = c.Messages.OrderByDescending(m => m.SentAtUtc).FirstOrDefault();
        return new ConversationListItemDto(
            c.Id,
            c.Subject,
            last?.Body,
            c.LastMessageAtUtc ?? last?.SentAtUtc,
            c.Status,
            c.Type,
            c.LandId,
            c.OfficerUserId,
            c.AdminUserId);
    }
}
