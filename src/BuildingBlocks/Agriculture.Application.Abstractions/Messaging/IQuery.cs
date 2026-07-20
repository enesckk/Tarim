using Agriculture.SharedKernel.Results;
using MediatR;

namespace Agriculture.Application.Abstractions.Messaging;

public interface IQuery<TResponse> : IRequest<Result<TResponse>>
{
}
