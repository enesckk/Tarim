using Agriculture.Modules.Harvest.Domain.Entities;

namespace Agriculture.Modules.Harvest.Application.Abstractions;

public interface IHarvestRepository
{
    Task AddHarvestAsync(HarvestRecord harvest, CancellationToken cancellationToken = default);
    Task AddDeliveryAsync(DeliveryRecord delivery, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<HarvestRecord>> GetHarvestsAsync(CancellationToken cancellationToken = default);
}
