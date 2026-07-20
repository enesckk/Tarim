using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Harvest.Application.Abstractions;
using Agriculture.Modules.Harvest.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Harvest.Application.Commands.RecordHarvest;

public sealed record RecordHarvestCommand(
    Guid SeasonId,
    Guid ProducerId,
    Guid LandId,
    string ProductName,
    decimal Quantity,
    DateOnly HarvestDate,
    string Unit,
    Guid? ProductionWorkflowId,
    string? Notes,
    string? BuyerName = null,
    decimal? UnitPrice = null,
    decimal? TotalAmount = null) : ICommand<Guid>;

public sealed class RecordHarvestCommandValidator : AbstractValidator<RecordHarvestCommand>
{
    public RecordHarvestCommandValidator()
    {
        RuleFor(x => x.ProductName).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.BuyerName).MaximumLength(200).When(x => !string.IsNullOrWhiteSpace(x.BuyerName));
        RuleFor(x => x.UnitPrice).GreaterThanOrEqualTo(0).When(x => x.UnitPrice.HasValue);
        RuleFor(x => x.TotalAmount).GreaterThanOrEqualTo(0).When(x => x.TotalAmount.HasValue);
    }
}

internal sealed class RecordHarvestCommandHandler(IHarvestRepository repository, IUnitOfWork uow)
    : ICommandHandler<RecordHarvestCommand, Guid>
{
    public async Task<Result<Guid>> Handle(RecordHarvestCommand request, CancellationToken cancellationToken)
    {
        var harvest = HarvestRecord.Create(
            request.SeasonId,
            request.ProducerId,
            request.LandId,
            request.ProductName,
            request.Quantity,
            request.HarvestDate,
            request.Unit,
            request.ProductionWorkflowId,
            request.Notes,
            request.BuyerName,
            request.UnitPrice,
            request.TotalAmount);

        await repository.AddHarvestAsync(harvest, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(harvest.Id);
    }
}
