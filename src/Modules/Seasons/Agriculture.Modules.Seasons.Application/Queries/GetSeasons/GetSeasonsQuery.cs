using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Seasons.Application.Abstractions;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Seasons.Application.Queries.GetSeasons;

public sealed record SeasonDto(Guid Id, string Name, int Year, DateOnly StartDate, DateOnly? EndDate, SeasonStatus Status, string? Description);
public sealed record GetSeasonsQuery : IQuery<IReadOnlyList<SeasonDto>>;

internal sealed class GetSeasonsQueryHandler(ISeasonRepository repository)
    : IQueryHandler<GetSeasonsQuery, IReadOnlyList<SeasonDto>>
{
    public async Task<Result<IReadOnlyList<SeasonDto>>> Handle(GetSeasonsQuery request, CancellationToken cancellationToken)
    {
        var seasons = await repository.GetAllAsync(cancellationToken);
        var dtos = seasons.Select(s => new SeasonDto(s.Id, s.Name, s.Year, s.StartDate, s.EndDate, s.Status, s.Description)).ToList();
        return Result.Success<IReadOnlyList<SeasonDto>>(dtos);
    }
}
