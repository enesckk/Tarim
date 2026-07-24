using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Producers.Application.Commands.RegisterProducer;

public sealed record RegisterProducerCommand(
    string FirstName,
    string LastName,
    string NationalId,
    string Phone,
    string? Email,
    string? Address,
    Guid? UserId = null) : ICommand<Guid>;

public sealed class RegisterProducerCommandValidator : AbstractValidator<RegisterProducerCommand>
{
    public RegisterProducerCommandValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.NationalId).NotEmpty().Length(11);
        RuleFor(x => x.Phone).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email));
    }
}

internal sealed class RegisterProducerCommandHandler(IProducerRepository repository, IUnitOfWork uow)
    : ICommandHandler<RegisterProducerCommand, Guid>
{
    public async Task<Result<Guid>> Handle(RegisterProducerCommand request, CancellationToken cancellationToken)
    {
        var producer = Producer.Create(
            request.FirstName,
            request.LastName,
            request.NationalId,
            request.Phone,
            request.Email,
            request.Address,
            request.UserId);

        await repository.AddAsync(producer, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(producer.Id);
    }
}
