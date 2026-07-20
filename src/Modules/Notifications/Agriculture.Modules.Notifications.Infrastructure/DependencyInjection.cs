using Agriculture.Modules.Notifications.Application;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Notifications.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddNotificationsModule(this IServiceCollection services)
    {
        services.AddNotificationsApplication();
        return services;
    }
}
