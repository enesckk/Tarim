using Agriculture.Modules.Tasks.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Tasks.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddTasksModule(this IServiceCollection services)
    {
        services.AddTasksApplication();
        return services;
    }
}
