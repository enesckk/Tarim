using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Lands.Application.Queries.GetLandNotes;

public sealed record LandNoteDto(Guid Id, Guid LandId, Guid AuthorUserId, string Body, DateTime CreatedAtUtc);

public sealed record GetLandNotesQuery(Guid LandId) : IQuery<IReadOnlyList<LandNoteDto>>;

internal sealed class GetLandNotesQueryHandler(ILandNoteRepository repository)
    : IQueryHandler<GetLandNotesQuery, IReadOnlyList<LandNoteDto>>
{
    public async Task<Result<IReadOnlyList<LandNoteDto>>> Handle(
        GetLandNotesQuery request,
        CancellationToken cancellationToken)
    {
        var notes = await repository.GetByLandIdAsync(request.LandId, cancellationToken);
        var dtos = notes.Select(n => new LandNoteDto(n.Id, n.LandId, n.AuthorUserId, n.Body, n.CreatedAtUtc)).ToList();
        return Result.Success<IReadOnlyList<LandNoteDto>>(dtos);
    }
}
