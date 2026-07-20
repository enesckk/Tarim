using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.Modules.Producers.Application.Queries.GetProducers;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Producers.Application.Queries.GetProducerById;

public sealed record GetProducerByIdQuery(Guid Id) : IQuery<ProducerDto>;

internal sealed class GetProducerByIdQueryHandler(IProducerRepository repository)
    : IQueryHandler<GetProducerByIdQuery, ProducerDto>
{
    public async Task<Result<ProducerDto>> Handle(GetProducerByIdQuery request, CancellationToken cancellationToken)
    {
        var producer = await repository.GetByIdAsync(request.Id, cancellationToken);
        if (producer is null)
            return Result.Failure<ProducerDto>(new Error("Producer.NotFound", "Üretici bulunamadı."));

        return Result.Success(new ProducerDto(
            producer.Id,
            producer.FirstName,
            producer.LastName,
            producer.FullName,
            producer.NationalId,
            producer.Phone,
            producer.Email,
            producer.IsActive,
            producer.Address));
    }
}
