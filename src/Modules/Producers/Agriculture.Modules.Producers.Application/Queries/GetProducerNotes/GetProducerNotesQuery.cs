using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Producers.Application.Queries.GetProducerNotes;

public sealed record ProducerNoteDto(
    Guid Id,
    Guid ProducerId,
    Guid AuthorUserId,
    string Body,
    DateTime CreatedAtUtc);

public sealed record GetProducerNotesQuery(Guid ProducerId) : IQuery<IReadOnlyList<ProducerNoteDto>>;

internal sealed class GetProducerNotesQueryHandler(IProducerNoteRepository repository)
    : IQueryHandler<GetProducerNotesQuery, IReadOnlyList<ProducerNoteDto>>
{
    public async Task<Result<IReadOnlyList<ProducerNoteDto>>> Handle(
        GetProducerNotesQuery request,
        CancellationToken cancellationToken)
    {
        var notes = await repository.GetByProducerIdAsync(request.ProducerId, cancellationToken);
        var dtos = notes
            .Select(n => new ProducerNoteDto(n.Id, n.ProducerId, n.AuthorUserId, n.Body, n.CreatedAtUtc))
            .ToList();
        return Result.Success<IReadOnlyList<ProducerNoteDto>>(dtos);
    }
}
