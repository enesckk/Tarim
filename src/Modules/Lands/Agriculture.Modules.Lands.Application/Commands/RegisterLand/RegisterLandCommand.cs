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
