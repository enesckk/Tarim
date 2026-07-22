using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Notifications.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Notifications.Application.Commands.MarkNotificationRead;

public sealed record MarkNotificationReadCommand(Guid NotificationId, Guid UserId) : ICommand;

internal sealed class MarkNotificationReadCommandHandler(
    INotificationRepository repository,
    IUnitOfWork uow) : ICommandHandler<MarkNotificationReadCommand>
{
    public async Task<Result> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
    {
        var notification = await repository.GetByIdAsync(request.NotificationId, cancellationToken);
        if (notification is null || notification.UserId != request.UserId)
            return Result.Failure(new Error("Notification.NotFound", "Bildirim bulunamadı."));

        if (!notification.IsRead)
        {
            notification.MarkAsRead();
            repository.Update(notification);
            await uow.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }
}

public sealed record MarkAllNotificationsReadCommand(Guid UserId) : ICommand;

internal sealed class MarkAllNotificationsReadCommandHandler(
    INotificationRepository repository,
    IUnitOfWork uow) : ICommandHandler<MarkAllNotificationsReadCommand>
{
    public async Task<Result> Handle(MarkAllNotificationsReadCommand request, CancellationToken cancellationToken)
    {
        var unread = await repository.GetUnreadByUserAsync(request.UserId, cancellationToken);
        foreach (var n in unread)
        {
            n.MarkAsRead();
            repository.Update(n);
        }

        if (unread.Count > 0)
            await uow.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
