using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Support.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddSupportApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        return services;
    }
}
