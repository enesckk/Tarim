using System.Text.Json;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using StackExchange.Redis;

namespace Agriculture.Infrastructure.Caching;

internal sealed class RedisCacheService : ICacheService
{
    private const string DefaultCacheInstanceName = "agriculture-api:cache:";
    private const string IncrementHashScript = """
        local keyType = redis.call('TYPE', KEYS[1])['ok']
        if keyType ~= 'none' and keyType ~= 'hash' then
            redis.call('DEL', KEYS[1])
        end
        local value = redis.call('HINCRBY', KEYS[1], 'data', 1)
        redis.call('HSET', KEYS[1], 'absexp', -1, 'sldexp', -1)
        return value
        """;

    private readonly IDistributedCache _cache;
    private readonly IConnectionMultiplexer _redis;
    private readonly string _cacheInstanceName;
    
    public RedisCacheService(
        IDistributedCache cache,
        IConnectionMultiplexer redis,
        IConfiguration configuration)
    {
        _cache = cache;
        _redis = redis;
        _cacheInstanceName = configuration["Redis:CacheInstanceName"]
            ?? DefaultCacheInstanceName;
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
        cancellationToken.ThrowIfCancellationRequested();
        var db = _redis.GetDatabase();
        var namespacedKey = (RedisKey)($"{_cacheInstanceName}{key}");

        // Microsoft.Extensions.Caching.StackExchangeRedis stores cache entries as
        // hashes (data/absexp/sldexp). Increment the hash's data field atomically;
        // StringIncrement would turn the same logical key into a Redis string and
        // make the next IDistributedCache read fail with WRONGTYPE.
        var value = await db.ScriptEvaluateAsync(
            IncrementHashScript,
            [namespacedKey]);

        return (int)(long)value;
    }
}
