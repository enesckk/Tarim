using Agriculture.Modules.Seasons.Domain.Entities;

namespace Agriculture.Modules.Seasons.Application.Abstractions;

public interface ISeasonRepository
{
    Task<Season?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Season>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Season season, CancellationToken cancellationToken = default);
    void Update(Season season);
}
