using Agriculture.Modules.Lands.Domain.Entities;

namespace Agriculture.Modules.Lands.Application.Abstractions;

public interface ILandRepository
{
    Task<Land?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Land>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Land>> GetByOfficerUserIdAsync(Guid officerUserId, CancellationToken cancellationToken = default);
    Task AddAsync(Land land, CancellationToken cancellationToken = default);
    void Update(Land land);
}

public interface ILandNoteRepository
{
    Task<IReadOnlyList<LandNote>> GetByLandIdAsync(Guid landId, CancellationToken cancellationToken = default);
    Task AddAsync(LandNote note, CancellationToken cancellationToken = default);
}
