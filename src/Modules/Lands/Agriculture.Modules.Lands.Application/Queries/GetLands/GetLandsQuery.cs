using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
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
    string? MapStatus = null);

public sealed record GetLandsQuery(Guid? OfficerUserIdFilter = null) : IQuery<IReadOnlyList<LandDto>>;

internal sealed class GetLandsQueryHandler(ILandRepository repository)
    : IQueryHandler<GetLandsQuery, IReadOnlyList<LandDto>>
{
    public async Task<Result<IReadOnlyList<LandDto>>> Handle(GetLandsQuery request, CancellationToken cancellationToken)
    {
        var lands = request.OfficerUserIdFilter.HasValue
            ? await repository.GetByOfficerUserIdAsync(request.OfficerUserIdFilter.Value, cancellationToken)
            : await repository.GetAllAsync(cancellationToken);

        var dtos = lands.Select(l => new LandDto(
            l.Id, l.Name, l.ParcelNumber, l.SizeInDecares, l.Latitude, l.Longitude,
            l.SoilType, l.ProducerId, l.AssignedOfficerUserId, l.IsActive,
            Neighborhood: l.Neighborhood,
            CadastralBlock: l.CadastralBlock,
            SoilNotes: l.SoilNotes)).ToList();
        return Result.Success<IReadOnlyList<LandDto>>(dtos);
    }
}
