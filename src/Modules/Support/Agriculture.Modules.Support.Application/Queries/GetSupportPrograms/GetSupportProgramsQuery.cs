using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Support.Application.Abstractions;
using Agriculture.Modules.Support.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Support.Application.Queries.GetSupportPrograms;

public sealed record SupportProgramDto(Guid Id, string Name, string SupportType, DateOnly StartDate, DateOnly? EndDate, SupportProgramStatus Status, decimal? Budget);
public sealed record GetSupportProgramsQuery : IQuery<IReadOnlyList<SupportProgramDto>>;

internal sealed class GetSupportProgramsQueryHandler(ISupportRepository repository)
    : IQueryHandler<GetSupportProgramsQuery, IReadOnlyList<SupportProgramDto>>
{
    public async Task<Result<IReadOnlyList<SupportProgramDto>>> Handle(GetSupportProgramsQuery request, CancellationToken cancellationToken)
    {
        var items = await repository.GetProgramsAsync(cancellationToken);
        var dtos = items.Select(p => new SupportProgramDto(p.Id, p.Name, p.SupportType, p.StartDate, p.EndDate, p.Status, p.Budget)).ToList();
        return Result.Success<IReadOnlyList<SupportProgramDto>>(dtos);
    }
}
