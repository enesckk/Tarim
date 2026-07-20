using Agriculture.Modules.Harvest.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Harvest.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddHarvestModule(this IServiceCollection services)
    {
        services.AddHarvestApplication();
        return services;
    }
}
