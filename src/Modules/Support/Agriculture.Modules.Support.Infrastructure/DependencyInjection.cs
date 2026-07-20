using Agriculture.Modules.Support.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Support.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSupportModule(this IServiceCollection services)
    {
        services.AddSupportApplication();
        return services;
    }
}
