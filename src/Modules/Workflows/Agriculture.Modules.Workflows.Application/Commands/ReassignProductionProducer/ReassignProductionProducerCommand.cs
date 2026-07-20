using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Workflows.Application.Commands.ReassignProductionProducer;

public sealed record ReassignProductionProducerCommand(Guid ProductionId, Guid ProducerId) : ICommand;

public sealed class ReassignProductionProducerCommandValidator : AbstractValidator<ReassignProductionProducerCommand>
{
    public ReassignProductionProducerCommandValidator()
    {
        RuleFor(x => x.ProductionId).NotEmpty();
        RuleFor(x => x.ProducerId).NotEmpty();
    }
}

internal sealed class ReassignProductionProducerCommandHandler(
    IProductionWorkflowRepository productionRepository,
    IUnitOfWork uow) : ICommandHandler<ReassignProductionProducerCommand>
{
    public async Task<Result> Handle(ReassignProductionProducerCommand request, CancellationToken cancellationToken)
    {
        var production = await productionRepository.GetByIdAsync(request.ProductionId, cancellationToken);
        if (production is null)
            return Result.Failure(new Error("Production.NotFound", "Üretim kaydı bulunamadı."));

        try
        {
            production.ReassignProducer(request.ProducerId);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure(new Error("Production.Invalid", ex.Message));
        }

        productionRepository.Update(production);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
