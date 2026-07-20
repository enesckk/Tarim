using Agriculture.Modules.Inspections.Domain.Entities;

namespace Agriculture.Modules.Inspections.Application.Abstractions;

public interface IInspectionRepository
{
    Task<Inspection?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Inspection>> GetByInspectorAsync(Guid inspectorUserId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Inspection>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Inspection inspection, CancellationToken cancellationToken = default);
    void Update(Inspection inspection);
}
