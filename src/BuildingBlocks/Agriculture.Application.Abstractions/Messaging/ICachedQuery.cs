using Agriculture.SharedKernel.Results;

namespace Agriculture.Application.Abstractions.Messaging;

public interface ICachedQuery<TResponse> : IQuery<TResponse>
{
    string CacheKey { get; }
    TimeSpan? ExpirationTime { get; }
}
