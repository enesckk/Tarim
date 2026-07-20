using Agriculture.Modules.Inspections.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Inspections.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInspectionsModule(this IServiceCollection services)
    {
        services.AddInspectionsApplication();
        return services;
    }
}
