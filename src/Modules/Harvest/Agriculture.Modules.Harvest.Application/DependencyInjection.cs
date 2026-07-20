using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Harvest.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddHarvestApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        return services;
    }
}
