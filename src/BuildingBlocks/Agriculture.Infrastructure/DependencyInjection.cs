using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Application.Abstractions.Data;
using Agriculture.Infrastructure.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Harvest.Application.Abstractions;
using Agriculture.Modules.Inspections.Application.Abstractions;
using Agriculture.Modules.Lands.Application.Abstractions;
using Agriculture.Modules.Notifications.Application.Abstractions;
using Agriculture.Modules.Producers.Application.Abstractions;
using Agriculture.Modules.Seasons.Application.Abstractions;
using Agriculture.Modules.Support.Application.Abstractions;
using Agriculture.Modules.Tasks.Application.Abstractions;
using Agriculture.Modules.Workflows.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddAgricultureInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddMemoryCache();
        services.AddScoped<IUserContext, UserContext>();

        services.AddDbContext<AgricultureDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IUnitOfWork>(sp => sp.GetRequiredService<AgricultureDbContext>());
        services.AddScoped<IProducerRepository, ProducerRepository>();
        services.AddScoped<IProducerNoteRepository, ProducerNoteRepository>();
        services.AddScoped<ILandRepository, LandRepository>();
        services.AddScoped<ILandNoteRepository, LandNoteRepository>();
        services.AddScoped<ISeasonRepository, SeasonRepository>();
        services.AddScoped<IWorkflowRepository, WorkflowRepository>();
        services.AddScoped<IProductionWorkflowRepository, ProductionWorkflowRepository>();
        services.AddScoped<ITaskRepository, TaskRepository>();
        services.AddScoped<IInspectionRepository, InspectionRepository>();
        services.AddScoped<IHarvestRepository, HarvestRepository>();
        services.AddScoped<ISupportRepository, SupportRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();

        return services;
    }
}
