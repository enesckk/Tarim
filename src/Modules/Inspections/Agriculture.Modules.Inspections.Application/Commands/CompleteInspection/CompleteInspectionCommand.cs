using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Inspections.Application.Abstractions;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Inspections.Application.Commands.CompleteInspection;

public sealed record CompleteInspectionCommand(Guid InspectionId, InspectionResult Result, string Report) : ICommand;

internal sealed class CompleteInspectionCommandHandler(IInspectionRepository repository, IUnitOfWork uow)
    : ICommandHandler<CompleteInspectionCommand>
{
    public async Task<Result> Handle(CompleteInspectionCommand request, CancellationToken cancellationToken)
    {
        var inspection = await repository.GetByIdAsync(request.InspectionId, cancellationToken);
        if (inspection is null)
            return Result.Failure(new Error("Inspection.NotFound", "Inspection was not found."));

        inspection.Complete(request.Result, request.Report);
        repository.Update(inspection);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
