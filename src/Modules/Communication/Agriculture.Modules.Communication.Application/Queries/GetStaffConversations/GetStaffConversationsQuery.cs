using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Communication.Application.Queries.GetConversations;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Communication.Application.Queries.GetStaffConversations;

/// <summary>Admin sees all; Officer sees threads where they are the assigned uzman (SDS-R16).</summary>
public sealed record GetStaffConversationsQuery(Guid? OfficerUserIdFilter = null)
    : IQuery<IReadOnlyList<ConversationListItemDto>>;

internal sealed class GetStaffConversationsQueryHandler(IConversationRepository repository)
    : IQueryHandler<GetStaffConversationsQuery, IReadOnlyList<ConversationListItemDto>>
{
    public async Task<Result<IReadOnlyList<ConversationListItemDto>>> Handle(
        GetStaffConversationsQuery request,
        CancellationToken cancellationToken)
    {
        var items = request.OfficerUserIdFilter.HasValue
            ? await repository.GetForOfficerAsync(request.OfficerUserIdFilter.Value, cancellationToken)
            : await repository.GetAllAsync(cancellationToken);

        var dtos = items.Select(GetConversationsQueryHandler.Map).ToList();
        return Result.Success<IReadOnlyList<ConversationListItemDto>>(dtos);
    }
}
