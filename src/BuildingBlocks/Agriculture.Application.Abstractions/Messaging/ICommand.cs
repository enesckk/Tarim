using Agriculture.SharedKernel.Results;
using MediatR;

namespace Agriculture.Application.Abstractions.Messaging;

public interface ICommand : IRequest<Result>
{
}

public interface ICommand<TResponse> : IRequest<Result<TResponse>>
{
}
