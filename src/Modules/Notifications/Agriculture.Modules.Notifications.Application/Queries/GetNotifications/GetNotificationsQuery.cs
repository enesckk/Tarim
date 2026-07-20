using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Notifications.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Notifications.Application.Queries.GetNotifications;

public sealed record NotificationDto(
    Guid Id,
    string Title,
    string Body,
    bool IsRead,
    DateTime CreatedAtUtc,
    string? RelatedEntityType,
    Guid? RelatedEntityId);

public sealed record GetNotificationsQuery(Guid UserId) : IQuery<IReadOnlyList<NotificationDto>>;

internal sealed class GetNotificationsQueryHandler(INotificationRepository repository)
    : IQueryHandler<GetNotificationsQuery, IReadOnlyList<NotificationDto>>
{
    public async Task<Result<IReadOnlyList<NotificationDto>>> Handle(
        GetNotificationsQuery request,
        CancellationToken cancellationToken)
    {
        var items = await repository.GetByUserAsync(request.UserId, cancellationToken);
        var dtos = items.Select(n => new NotificationDto(
            n.Id, n.Title, n.Body, n.IsRead, n.CreatedAtUtc, n.RelatedEntityType, n.RelatedEntityId)).ToList();
        return Result.Success<IReadOnlyList<NotificationDto>>(dtos);
    }
}
