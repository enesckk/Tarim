using Agriculture.Application.Abstractions.Caching;
using Microsoft.Extensions.Caching.Memory;

namespace Agriculture.Infrastructure.Caching;

internal sealed class MemoryCacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    
    public MemoryCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        _cache.TryGetValue(key, out T? value);
        return Task.FromResult(value);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, CancellationToken cancellationToken = default)
    {
        var options = new MemoryCacheEntryOptions();
        if (absoluteExpirationRelativeToNow.HasValue)
        {
            options.AbsoluteExpirationRelativeToNow = absoluteExpirationRelativeToNow.Value;
        }

        _cache.Set(key, value, options);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _cache.Remove(key);
        return Task.CompletedTask;
    }

    public Task<int> IncrementAsync(string key, CancellationToken cancellationToken = default)
    {
        // Simple thread-safe in-memory increment fallback
        lock (_cache)
        {
            var val = _cache.Get<int>(key);
            val++;
            _cache.Set(key, val);
            return Task.FromResult(val);
        }
    }
}
