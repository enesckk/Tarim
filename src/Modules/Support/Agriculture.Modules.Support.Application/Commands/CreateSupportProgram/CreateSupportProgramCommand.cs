using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Support.Application.Abstractions;
using Agriculture.Modules.Support.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Support.Application.Commands.CreateSupportProgram;

public sealed record CreateSupportProgramCommand(
    string Name, string SupportType, DateOnly StartDate, string? Description, DateOnly? EndDate, decimal? Budget) : ICommand<Guid>;

public sealed class CreateSupportProgramCommandValidator : AbstractValidator<CreateSupportProgramCommand>
{
    public CreateSupportProgramCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
        RuleFor(x => x.SupportType).NotEmpty();
    }
}

internal sealed class CreateSupportProgramCommandHandler(ISupportRepository repository, IUnitOfWork uow)
    : ICommandHandler<CreateSupportProgramCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateSupportProgramCommand request, CancellationToken cancellationToken)
    {
        var program = SupportProgram.Create(request.Name, request.SupportType, request.StartDate, request.Description, request.EndDate, request.Budget);
        program.Open();
        await repository.AddProgramAsync(program, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(program.Id);
    }
}
