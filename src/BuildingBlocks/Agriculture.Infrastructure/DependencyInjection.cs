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
using Agriculture.Application.Abstractions.Caching;
using Agriculture.Application.Abstractions.Storage;
using Agriculture.Infrastructure.Caching;
using Agriculture.Infrastructure.Storage;
using Hangfire;
using Hangfire.SqlServer;
using Hangfire.MemoryStorage;
using StackExchange.Redis;
using Minio;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddAgricultureInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        
        var redisConnStr = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnStr))
        {
            var redisCacheInstanceName = configuration["Redis:CacheInstanceName"]
                ?? "agriculture-api:cache:";
            var multiplexer = ConnectionMultiplexer.Connect(redisConnStr);
            services.AddSingleton<IConnectionMultiplexer>(multiplexer);
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisConnStr;
                // Redis is shared with SignalR and Tarim AI. Namespace every
                // distributed-cache key so an unrelated component cannot reuse it
                // with a different Redis data type.
                options.InstanceName = redisCacheInstanceName;
            });
            services.AddSingleton<ICacheService, RedisCacheService>();
        }
        else
        {
            // Fallback for local development if Redis isn't configured
            services.AddMemoryCache();
            services.AddSingleton<ICacheService, MemoryCacheService>();
        }
        
        services.AddScoped<IUserContext, UserContext>();

        var connStr = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=AgricultureDb.sqlite";
        var isSqlite = connStr.Contains("Data Source=", StringComparison.OrdinalIgnoreCase)
                    || connStr.EndsWith(".db", StringComparison.OrdinalIgnoreCase)
                    || connStr.EndsWith(".sqlite", StringComparison.OrdinalIgnoreCase);

        if (isSqlite)
        {
            services.AddDbContext<AgricultureDbContext>(options =>
                options.UseSqlite(connStr)
                    .ConfigureWarnings(w =>
                        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

            services.AddHangfire(config => config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UseMemoryStorage());
        }
        else
        {
            services.AddDbContext<AgricultureDbContext>(options =>
                options.UseSqlServer(connStr)
                    .ConfigureWarnings(w =>
                        w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

            // Hangfire Entegrasyonu
            services.AddHangfire(config => config
                .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                .UseSimpleAssemblyNameTypeSerializer()
                .UseRecommendedSerializerSettings()
                .UseSqlServerStorage(connStr, new SqlServerStorageOptions
                {
                    CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                    PrepareSchemaIfNecessary = true,
                    DashboardJobListLimit = 50000,
                    TransactionTimeout = TimeSpan.FromMinutes(1)
                }));
        }

        services.AddHangfireServer();

        // MinIO Entegrasyonu
        var minioEndpoint = configuration["Minio:Endpoint"] ?? "localhost:9000";
        var minioAccessKey = configuration["Minio:AccessKey"] ?? "admin";
        var minioSecretKey = configuration["Minio:SecretKey"] ?? "minio-admin-password";
        var minioUseSsl = configuration.GetValue("Minio:UseSsl", false);
        
        services.AddSingleton<Minio.IMinioClient>(sp => new Minio.MinioClient()
            .WithEndpoint(minioEndpoint)
            .WithCredentials(minioAccessKey, minioSecretKey)
            .WithSSL(minioUseSsl)
            .Build());

        if (configuration.GetValue("Minio:Enabled", false))
            services.AddSingleton<IStorageService, MinioStorageService>();
        else
            services.AddSingleton<IStorageService, LocalStorageService>();

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
