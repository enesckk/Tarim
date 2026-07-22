using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.Modules.Lands.Application.Queries.GetLands;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Lands.Application.Queries.GetLandById;

public sealed record GetLandByIdQuery(Guid Id) : IQuery<LandDto>;

public sealed class GetLandByIdQueryValidator : AbstractValidator<GetLandByIdQuery>
{
    public GetLandByIdQueryValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
    }
}

internal sealed class GetLandByIdQueryHandler(ILandRepository repository)
    : IQueryHandler<GetLandByIdQuery, LandDto>
{
    public async Task<Result<LandDto>> Handle(GetLandByIdQuery request, CancellationToken cancellationToken)
    {
        var land = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (land is null)
            return Result.Failure<LandDto>(new Error("Land.NotFound", "Arazi bulunamadı."));

        return Result.Success(new LandDto(
            land.Id,
            land.Name,
            land.ParcelNumber,
            land.SizeInDecares,
            land.Latitude,
            land.Longitude,
            land.SoilType,
            land.ProducerId,
            land.AssignedOfficerUserId,
            land.IsActive,
            Neighborhood: land.Neighborhood,
            CadastralBlock: land.CadastralBlock,
            SoilNotes: land.SoilNotes,
            City: land.City,
            District: land.District));
    }
}
