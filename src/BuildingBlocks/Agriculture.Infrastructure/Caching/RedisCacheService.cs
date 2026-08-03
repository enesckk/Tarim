using System.Text.Json;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.Extensions.Caching.Distributed;
using StackExchange.Redis;

namespace Agriculture.Infrastructure.Caching;

internal sealed class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly IConnectionMultiplexer _redis;
    
    public RedisCacheService(IDistributedCache cache, IConnectionMultiplexer redis)
    {
        _cache = cache;
        _redis = redis;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var cachedData = await _cache.GetStringAsync(key, cancellationToken);
        if (string.IsNullOrEmpty(cachedData))
            return default;

        return JsonSerializer.Deserialize<T>(cachedData);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, CancellationToken cancellationToken = default)
    {
        var options = new DistributedCacheEntryOptions();
        if (absoluteExpirationRelativeToNow.HasValue)
        {
            options.AbsoluteExpirationRelativeToNow = absoluteExpirationRelativeToNow.Value;
        }

        var serializedData = JsonSerializer.Serialize(value);
        await _cache.SetStringAsync(key, serializedData, options, cancellationToken);
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        await _cache.RemoveAsync(key, cancellationToken);
    }

    public async Task<int> IncrementAsync(string key, CancellationToken cancellationToken = default)
    {
        var db = _redis.GetDatabase();
        var val = await db.StringIncrementAsync(key);
        return (int)val;
    }
}
