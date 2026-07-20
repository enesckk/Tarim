using Agriculture.Modules.Producers.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Producers.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddProducersModule(this IServiceCollection services)
    {
        services.AddProducersApplication();
        return services;
    }
}
