using Agriculture.Modules.Lands.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Lands.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddLandsModule(this IServiceCollection services)
    {
        services.AddLandsApplication();
        return services;
    }
}
