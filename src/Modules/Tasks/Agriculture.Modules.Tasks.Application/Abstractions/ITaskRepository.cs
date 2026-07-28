using Agriculture.Modules.Tasks.Domain.Entities;

namespace Agriculture.Modules.Tasks.Application.Abstractions;

public interface ITaskRepository
{
    Task<ProductionTask?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductionTask>> GetByProducerAsync(Guid producerId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductionTask>> GetByLandIdsAsync(
        IReadOnlyCollection<Guid> landIds,
        Guid? producerId = null,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductionTask>> GetByProductionWorkflowAsync(Guid productionWorkflowId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductionTask>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(ProductionTask task, CancellationToken cancellationToken = default);
    Task AddRangeAsync(IEnumerable<ProductionTask> tasks, CancellationToken cancellationToken = default);
    void MarkPhotoAdded(TaskPhoto photo);
    void Update(ProductionTask task);
}
