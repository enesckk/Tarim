using Agriculture.Modules.Notifications.Domain.Entities;

namespace Agriculture.Modules.Notifications.Application.Abstractions;

public interface INotificationRepository
{
    Task<IReadOnlyList<Notification>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Notification notification, CancellationToken cancellationToken = default);
}
