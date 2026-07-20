using Agriculture.Modules.Producers.Domain.Entities;

namespace Agriculture.Modules.Producers.Application.Abstractions;

public interface IProducerRepository
{
    Task<Producer?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Producer?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Producer>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Producer producer, CancellationToken cancellationToken = default);
    void Update(Producer producer);
}

public interface IProducerNoteRepository
{
    Task<IReadOnlyList<ProducerNote>> GetByProducerIdAsync(Guid producerId, CancellationToken cancellationToken = default);
    Task AddAsync(ProducerNote note, CancellationToken cancellationToken = default);
}
