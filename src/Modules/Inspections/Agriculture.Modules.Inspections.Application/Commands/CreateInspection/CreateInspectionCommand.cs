using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Inspections.Application.Abstractions;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Inspections.Application.Commands.CreateInspection;

public sealed record CreateInspectionCommand(
    Guid LandId,
    Guid ProducerId,
    Guid InspectorUserId,
    string Title,
    DateOnly ScheduledDate,
    string? Description,
    Guid? SeasonId,
    Guid? ProductionWorkflowId) : ICommand<Guid>;

public sealed class CreateInspectionCommandValidator : AbstractValidator<CreateInspectionCommand>
{
    public CreateInspectionCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.LandId).NotEmpty();
        RuleFor(x => x.ProducerId).NotEmpty();
        RuleFor(x => x.InspectorUserId).NotEmpty();
    }
}

internal sealed class CreateInspectionCommandHandler(IInspectionRepository repository, IUnitOfWork uow)
    : ICommandHandler<CreateInspectionCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateInspectionCommand request, CancellationToken cancellationToken)
    {
        var inspection = Inspection.Create(
            request.LandId,
            request.ProducerId,
            request.InspectorUserId,
            request.Title,
            request.ScheduledDate,
            request.Description,
            request.SeasonId,
            request.ProductionWorkflowId);

        await repository.AddAsync(inspection, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(inspection.Id);
    }
}
