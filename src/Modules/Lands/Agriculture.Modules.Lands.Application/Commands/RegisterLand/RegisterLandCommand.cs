using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Lands.Application.Commands.RegisterLand;

public sealed record RegisterLandCommand(
    string Name,
    string ParcelNumber,
    decimal SizeInDecares,
    string? CadastralBlock,
    double? Latitude,
    double? Longitude,
    string? SoilType,
    string? SoilNotes,
    string? City,
    string? District,
    string? Neighborhood,
    Guid? ProducerId) : ICommand<Guid>;

public sealed class RegisterLandCommandValidator : AbstractValidator<RegisterLandCommand>
{
    public RegisterLandCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200).WithName("Arazi adı");
        RuleFor(x => x.ParcelNumber).NotEmpty().MaximumLength(50).WithName("Parsel numarası");
        RuleFor(x => x.SizeInDecares).GreaterThan(0).WithName("Alan (dekar)");
        RuleFor(x => x.CadastralBlock).MaximumLength(50).When(x => x.CadastralBlock is not null);
        // Optional — municipal lands often only have ada/parsel.
        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .When(x => x.Latitude.HasValue)
            .WithName("Enlem")
            .WithMessage("Enlem -90 ile 90 arasında olmalı (ör. 37.08). Ada veya parsel numarasını enlem alanına yazmayın. Girdiğiniz değer: {PropertyValue}");
        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .When(x => x.Longitude.HasValue)
            .WithName("Boylam")
            .WithMessage("Boylam -180 ile 180 arasında olmalı (ör. 37.38). Ada veya parsel numarasını boylam alanına yazmayın. Girdiğiniz değer: {PropertyValue}");
    }
}

internal sealed class RegisterLandCommandHandler(ILandRepository repository, IUnitOfWork uow)
    : ICommandHandler<RegisterLandCommand, Guid>
{
    public async Task<Result<Guid>> Handle(RegisterLandCommand request, CancellationToken cancellationToken)
    {
        static string? NullIfEmpty(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        var land = Land.Create(
            request.Name,
            request.ParcelNumber,
            request.SizeInDecares,
            NullIfEmpty(request.CadastralBlock),
            request.Latitude,
            request.Longitude,
            NullIfEmpty(request.SoilType),
            NullIfEmpty(request.SoilNotes),
            NullIfEmpty(request.City),
            NullIfEmpty(request.District),
            NullIfEmpty(request.Neighborhood));

        if (request.ProducerId.HasValue)
            land.AssignProducer(request.ProducerId.Value);

        await repository.AddAsync(land, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(land.Id);
    }
}
