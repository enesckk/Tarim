using Agriculture.Modules.Communication.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Communication.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCommunicationModule(this IServiceCollection services)
    {
        services.AddCommunicationApplication();
        return services;
    }
}
