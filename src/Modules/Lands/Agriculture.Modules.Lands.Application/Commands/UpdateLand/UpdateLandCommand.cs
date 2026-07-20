using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Lands.Application.Commands.UpdateLand;

public sealed record UpdateLandCommand(
    Guid LandId,
    string Name,
    decimal SizeInDecares,
    double? Latitude,
    double? Longitude,
    string? SoilType,
    string? SoilNotes) : ICommand;

public sealed class UpdateLandCommandValidator : AbstractValidator<UpdateLandCommand>
{
    public UpdateLandCommandValidator()
    {
        RuleFor(x => x.LandId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.SizeInDecares).GreaterThan(0);
        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .When(x => x.Latitude.HasValue);
        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .When(x => x.Longitude.HasValue);
    }
}

internal sealed class UpdateLandCommandHandler(ILandRepository repository, IUnitOfWork uow)
    : ICommandHandler<UpdateLandCommand>
{
    public async Task<Result> Handle(UpdateLandCommand request, CancellationToken cancellationToken)
    {
        static string? NullIfEmpty(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        var land = await repository.GetByIdAsync(request.LandId, cancellationToken);
        if (land is null)
            return Result.Failure(new Error("Land.NotFound", "Arazi bulunamadı."));

        land.Update(
            request.Name,
            request.SizeInDecares,
            request.Latitude,
            request.Longitude,
            NullIfEmpty(request.SoilType),
            NullIfEmpty(request.SoilNotes));
        repository.Update(land);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
