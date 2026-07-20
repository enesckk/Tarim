using Agriculture.Modules.Seasons.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Seasons.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSeasonsModule(this IServiceCollection services)
    {
        services.AddSeasonsApplication();
        return services;
    }
}
