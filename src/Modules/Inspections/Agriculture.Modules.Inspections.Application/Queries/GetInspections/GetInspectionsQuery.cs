using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Inspections.Application.Abstractions;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Inspections.Application.Queries.GetInspections;

public sealed record InspectionDto(
    Guid Id, Guid LandId, Guid ProducerId, Guid InspectorUserId, string Title,
    DateOnly ScheduledDate, InspectionStatus Status, InspectionResult Result, DateTime? CompletedAtUtc);

public sealed record GetInspectionsQuery(Guid? InspectorUserId = null) : IQuery<IReadOnlyList<InspectionDto>>;

internal sealed class GetInspectionsQueryHandler(IInspectionRepository repository)
    : IQueryHandler<GetInspectionsQuery, IReadOnlyList<InspectionDto>>
{
    public async Task<Result<IReadOnlyList<InspectionDto>>> Handle(GetInspectionsQuery request, CancellationToken cancellationToken)
    {
        var items = request.InspectorUserId.HasValue
            ? await repository.GetByInspectorAsync(request.InspectorUserId.Value, cancellationToken)
            : await repository.GetAllAsync(cancellationToken);

        var dtos = items.Select(i => new InspectionDto(
            i.Id, i.LandId, i.ProducerId, i.InspectorUserId, i.Title,
            i.ScheduledDate, i.Status, i.Result, i.CompletedAtUtc)).ToList();

        return Result.Success<IReadOnlyList<InspectionDto>>(dtos);
    }
}
