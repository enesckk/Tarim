using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Seasons.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddSeasonsApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        return services;
    }
}
