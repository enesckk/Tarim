using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Modules.Workflows.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddWorkflowsApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly);
        return services;
    }
}
