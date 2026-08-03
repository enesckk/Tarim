using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Lands.Application.Queries.GetLands;

public sealed record LandDto(
    Guid Id,
    string Name,
    string ParcelNumber,
    decimal SizeInDecares,
    double? Latitude,
    double? Longitude,
    string? SoilType,
    Guid? ProducerId,
    Guid? AssignedOfficerUserId,
    bool IsActive,
    int AlertCount = 0,
    string? ActiveCropType = null,
    string? ActiveWorkflowName = null,
    string? Neighborhood = null,
    string? CadastralBlock = null,
    string? SoilNotes = null,
    string? MapStatus = null,
    string? City = null,
    string? District = null);

public sealed record GetLandsQuery(
    Guid? OfficerUserIdFilter = null,
    Guid? ProducerIdFilter = null) : ICachedQuery<IReadOnlyList<LandDto>>
{
    public string CacheKey => $"lands:{OfficerUserIdFilter?.ToString() ?? "all"}:{ProducerIdFilter?.ToString() ?? "all"}";
    public TimeSpan? ExpirationTime => TimeSpan.FromMinutes(30);
}

internal sealed class GetLandsQueryHandler(ILandRepository repository)
    : IQueryHandler<GetLandsQuery, IReadOnlyList<LandDto>>
{
    public async Task<Result<IReadOnlyList<LandDto>>> Handle(GetLandsQuery request, CancellationToken cancellationToken)
    {
        IReadOnlyList<Land> lands;
        if (request.ProducerIdFilter.HasValue)
            lands = await repository.GetByProducerIdAsync(request.ProducerIdFilter.Value, cancellationToken);
        else if (request.OfficerUserIdFilter.HasValue)
            lands = await repository.GetByOfficerUserIdAsync(request.OfficerUserIdFilter.Value, cancellationToken);
        else
            lands = await repository.GetAllAsync(cancellationToken);

        var dtos = lands.Select(l => new LandDto(
            l.Id, l.Name, l.ParcelNumber, l.SizeInDecares, l.Latitude, l.Longitude,
            l.SoilType, l.ProducerId, l.AssignedOfficerUserId, l.IsActive,
            Neighborhood: l.Neighborhood,
            CadastralBlock: l.CadastralBlock,
            SoilNotes: l.SoilNotes,
            City: l.City,
            District: l.District)).ToList();
        return Result.Success<IReadOnlyList<LandDto>>(dtos);
    }
}
