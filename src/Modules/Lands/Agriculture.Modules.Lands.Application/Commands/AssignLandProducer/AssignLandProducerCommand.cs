using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Lands.Application.Commands.AssignLandProducer;

public sealed record AssignLandProducerCommand(Guid LandId, Guid ProducerId) : ICommand;

public sealed class AssignLandProducerCommandValidator : AbstractValidator<AssignLandProducerCommand>
{
    public AssignLandProducerCommandValidator()
    {
        RuleFor(x => x.LandId).NotEmpty();
        RuleFor(x => x.ProducerId).NotEmpty();
    }
}

internal sealed class AssignLandProducerCommandHandler(ILandRepository repository, IUnitOfWork uow)
    : ICommandHandler<AssignLandProducerCommand>
{
    public async Task<Result> Handle(AssignLandProducerCommand request, CancellationToken cancellationToken)
    {
        var land = await repository.GetByIdAsync(request.LandId, cancellationToken);
        if (land is null)
            return Result.Failure(new Error("Land.NotFound", "Arazi bulunamadı."));

        land.AssignProducer(request.ProducerId);
        repository.Update(land);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
