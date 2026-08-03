using Agriculture.Application.Abstractions.Caching;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.SharedKernel.Results;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Agriculture.Application.Abstractions.Behaviors;

public sealed class QueryCachingBehavior<TRequest, TResponse>(
    ICacheService cacheService,
    ILogger<QueryCachingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICachedQuery<TResponse>
    where TResponse : Result
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var cacheKey = request.CacheKey;
        
        try
        {
            var cachedResponse = await cacheService.GetAsync<TResponse>(cacheKey, cancellationToken);
            if (cachedResponse is not null)
            {
                logger.LogInformation("Cache hit for {CacheKey}", cacheKey);
                return cachedResponse;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error reading from cache for key {CacheKey}", cacheKey);
        }

        logger.LogInformation("Cache miss for {CacheKey}. Executing query.", cacheKey);
        var response = await next();

        if (response.IsSuccess)
        {
            try
            {
                await cacheService.SetAsync(cacheKey, response, request.ExpirationTime, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error writing to cache for key {CacheKey}", cacheKey);
            }
        }

        return response;
    }
}
