using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Harvest.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Harvest.Application.Queries.GetHarvests;

public sealed record HarvestDto(
    Guid Id,
    Guid SeasonId,
    Guid ProducerId,
    Guid LandId,
    string ProductName,
    decimal Quantity,
    string Unit,
    DateOnly HarvestDate,
    string? BuyerName,
    decimal? UnitPrice,
    decimal? TotalAmount);

public sealed record GetHarvestsQuery : IQuery<IReadOnlyList<HarvestDto>>;

internal sealed class GetHarvestsQueryHandler(IHarvestRepository repository)
    : IQueryHandler<GetHarvestsQuery, IReadOnlyList<HarvestDto>>
{
    public async Task<Result<IReadOnlyList<HarvestDto>>> Handle(GetHarvestsQuery request, CancellationToken cancellationToken)
    {
        var items = await repository.GetHarvestsAsync(cancellationToken);
        var dtos = items.Select(h => new HarvestDto(
            h.Id,
            h.SeasonId,
            h.ProducerId,
            h.LandId,
            h.ProductName,
            h.Quantity,
            h.Unit,
            h.HarvestDate,
            h.BuyerName,
            h.UnitPrice,
            h.TotalAmount)).ToList();
        return Result.Success<IReadOnlyList<HarvestDto>>(dtos);
    }
}
