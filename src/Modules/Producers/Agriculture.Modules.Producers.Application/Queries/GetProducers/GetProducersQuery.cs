using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Producers.Application.Queries.GetProducers;

public sealed record ProducerDto(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string NationalId,
    string Phone,
    string? Email,
    bool IsActive,
    string? Address = null);

public sealed record GetProducersQuery : IQuery<IReadOnlyList<ProducerDto>>;

internal sealed class GetProducersQueryHandler(IProducerRepository repository)
    : IQueryHandler<GetProducersQuery, IReadOnlyList<ProducerDto>>
{
    public async Task<Result<IReadOnlyList<ProducerDto>>> Handle(GetProducersQuery request, CancellationToken cancellationToken)
    {
        var producers = await repository.GetAllAsync(cancellationToken);
        var dtos = producers.Select(p => new ProducerDto(
            p.Id, p.FirstName, p.LastName, p.FullName, p.NationalId, p.Phone, p.Email, p.IsActive, p.Address)).ToList();
        return Result.Success<IReadOnlyList<ProducerDto>>(dtos);
    }
}
