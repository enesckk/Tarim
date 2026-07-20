using Agriculture.Modules.Workflows.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Workflows.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddWorkflowsModule(this IServiceCollection services)
    {
        services.AddWorkflowsApplication();
        return services;
    }
}
