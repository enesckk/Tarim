using Agriculture.Modules.Support.Domain.Entities;

namespace Agriculture.Modules.Support.Application.Abstractions;

public interface ISupportRepository
{
    Task<SupportProgram?> GetProgramByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupportProgram>> GetProgramsAsync(CancellationToken cancellationToken = default);
    Task AddProgramAsync(SupportProgram program, CancellationToken cancellationToken = default);
    Task AddAssignmentAsync(SupportAssignment assignment, CancellationToken cancellationToken = default);
    void UpdateProgram(SupportProgram program);
}
