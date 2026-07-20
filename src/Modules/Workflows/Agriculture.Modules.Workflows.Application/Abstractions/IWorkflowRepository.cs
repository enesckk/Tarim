using Agriculture.Modules.Workflows.Domain.Entities;

namespace Agriculture.Modules.Workflows.Application.Abstractions;

public interface IWorkflowRepository
{
    Task<Workflow?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Workflow>> GetAllAsync(CancellationToken cancellationToken = default);
    Task AddAsync(Workflow workflow, CancellationToken cancellationToken = default);
    void Update(Workflow workflow);
}

public interface IProductionWorkflowRepository
{
    Task<ProductionWorkflow?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ProductionWorkflow>> GetByLandIdAsync(Guid landId, CancellationToken cancellationToken = default);
    Task AddAsync(ProductionWorkflow productionWorkflow, CancellationToken cancellationToken = default);
    void Update(ProductionWorkflow productionWorkflow);
}
