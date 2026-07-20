using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Lands.Application.Commands.AssignLandAssignments;

public sealed record AssignLandAssignmentsCommand(
    Guid LandId,
    Guid? ProducerId,
    Guid? OfficerUserId) : ICommand;

public sealed class AssignLandAssignmentsCommandValidator : AbstractValidator<AssignLandAssignmentsCommand>
{
    public AssignLandAssignmentsCommandValidator()
    {
        RuleFor(x => x.LandId).NotEmpty();
        RuleFor(x => x)
            .Must(x => x.ProducerId.HasValue || x.OfficerUserId.HasValue)
            .WithMessage("En az bir atama (üretici veya uzman) gerekli.");
    }
}

internal sealed class AssignLandAssignmentsCommandHandler(ILandRepository repository, IUnitOfWork uow)
    : ICommandHandler<AssignLandAssignmentsCommand>
{
    public async Task<Result> Handle(AssignLandAssignmentsCommand request, CancellationToken cancellationToken)
    {
        var land = await repository.GetByIdAsync(request.LandId, cancellationToken);
        if (land is null)
            return Result.Failure(new Error("Land.NotFound", "Arazi bulunamadı."));

        land.UpdateAssignments(request.ProducerId, request.OfficerUserId);
        repository.Update(land);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
