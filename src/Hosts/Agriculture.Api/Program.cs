using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Application.Abstractions.Behaviors;
using Agriculture.Infrastructure;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Communication.Application.Commands.AskExpert;
using Agriculture.Modules.Communication.Application.Commands.SendMessage;
using Agriculture.Modules.Communication.Application.Queries.GetConversationMessages;
using Agriculture.Modules.Communication.Application.Queries.GetConversations;
using Agriculture.Modules.Communication.Infrastructure;
using Agriculture.Modules.Harvest.Application.Commands.RecordHarvest;
using Agriculture.Modules.Harvest.Application.Queries.GetHarvests;
using Agriculture.Modules.Harvest.Infrastructure;
using Agriculture.Modules.Identity.Application.Abstractions;
using Agriculture.Modules.Identity.Application.Commands.Login;
using Agriculture.Modules.Identity.Application.Commands.RefreshToken;
using Agriculture.Modules.Identity.Application.Commands.RegisterUser;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Identity.Infrastructure.Persistence;
using Agriculture.Modules.Inspections.Application.Commands.CompleteInspection;
using Agriculture.Modules.Inspections.Application.Commands.CreateInspection;
using Agriculture.Modules.Inspections.Application.Queries.GetInspections;
using Agriculture.Modules.Inspections.Domain.Entities;
using Agriculture.Modules.Inspections.Infrastructure;
using Agriculture.Modules.Lands.Application.Commands.AssignLandAssignments;
using Agriculture.Modules.Lands.Application.Commands.AssignLandProducer;
using Agriculture.Modules.Lands.Application.Commands.AddLandNote;
using Agriculture.Modules.Lands.Application.Commands.RegisterLand;
using Agriculture.Modules.Lands.Application.Commands.UpdateLand;
using Agriculture.Modules.Lands.Application.Queries.GetLandById;
using Agriculture.Modules.Lands.Application.Queries.GetLandNotes;
using Agriculture.Modules.Lands.Application.Queries.GetLands;
using Agriculture.Modules.Lands.Domain.Entities;
using Agriculture.Modules.Lands.Infrastructure;
using Agriculture.Modules.Communication.Application.Commands.StartStaffConversation;
using Agriculture.Modules.Notifications.Application.Commands.MarkNotificationRead;
using Agriculture.Modules.Notifications.Application.Queries.GetNotifications;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Notifications.Infrastructure;
using Agriculture.Modules.Producers.Application.Commands.AddProducerNote;
using Agriculture.Modules.Producers.Application.Commands.RegisterProducer;
using Agriculture.Modules.Producers.Application.Queries.GetProducerById;
using Agriculture.Modules.Producers.Application.Queries.GetProducerNotes;
using Agriculture.Modules.Producers.Application.Queries.GetProducers;
using Agriculture.Modules.Producers.Domain.Entities;
using Agriculture.Modules.Producers.Infrastructure;
using Agriculture.Modules.Seasons.Application.Commands.CreateSeason;
using Agriculture.Modules.Seasons.Application.Commands.StartSeason;
using Agriculture.Modules.Seasons.Application.Queries.GetSeasons;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.Modules.Seasons.Infrastructure;
using Agriculture.Modules.Support.Application.Commands.CreateSupportProgram;
using Agriculture.Modules.Support.Application.Queries.GetSupportPrograms;
using Agriculture.Modules.Support.Infrastructure;
using Agriculture.Modules.Tasks.Application.Commands.AddTaskPhoto;
using Agriculture.Modules.Tasks.Application.Commands.ApproveTask;
using Agriculture.Modules.Tasks.Application.Commands.RejectTask;
using Agriculture.Modules.Tasks.Application.Commands.CompleteTask;
using Agriculture.Modules.Tasks.Application.Commands.CreateTask;
using Agriculture.Modules.Tasks.Application.Queries.GetTaskById;
using Agriculture.Modules.Tasks.Application.Queries.GetTasks;
using Agriculture.Modules.Tasks.Application.Queries.GetTodayTasks;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.Modules.Tasks.Infrastructure;
using Agriculture.Modules.Workflows.Application.Commands.AssignProductionWorkflow;
using Agriculture.Modules.Workflows.Application.Commands.CreateWorkflow;
using Agriculture.Modules.Workflows.Application.Commands.ReassignProductionProducer;
using Agriculture.Modules.Workflows.Application.Commands.UpdateWorkflow;
using Agriculture.Modules.Communication.Application.Queries.GetStaffConversations;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.Modules.Harvest.Domain.Entities;
using Agriculture.Modules.Workflows.Application.Queries.GetLandProductions;
using Agriculture.Modules.Workflows.Application.Queries.GetWorkflows;
using Agriculture.Modules.Workflows.Domain.Entities;
using Agriculture.Modules.Workflows.Infrastructure;
using Agriculture.SharedKernel.Results;
using MediatR;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.OpenApi.Models;
using Serilog;
using Hangfire;
using Agriculture.Api.Hubs;
using Agriculture.Application.Abstractions.Caching;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    RuntimeConfigGuard.Validate(builder.Environment, builder.Configuration);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.Seq(context.Configuration["Seq:ServerUrl"] ?? "http://localhost:5341"));

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
            policy.WithOrigins(
                    builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                    ??
                    [
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://localhost:5174",
                        "http://127.0.0.1:5174",
                        "http://localhost:3000",
                        "http://127.0.0.1:3000",
                        "http://localhost:8081",
                        "http://127.0.0.1:8081"
                    ])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
    });

    var signalRBuilder = builder.Services.AddSignalR();
    var redisConnStr = builder.Configuration.GetConnectionString("Redis");
    if (!string.IsNullOrEmpty(redisConnStr))
    {
        signalRBuilder.AddStackExchangeRedis(redisConnStr);
    }
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(options =>
    {
        options.SwaggerDoc("v1", new OpenApiInfo
        {
            Title = "Agriculture Management System API",
            Version = "v1",
            Description = "Municipal agriculture production management platform"
        });
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme.",
            Name = "Authorization",
            In = ParameterLocation.Header,
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT"
        });
        options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                },
                Array.Empty<string>()
            }
        });
    });

    builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(QueryCachingBehavior<,>));

    builder.Services.Configure<FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 20 * 1024 * 1024;
    });
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Limits.MaxRequestBodySize = 20 * 1024 * 1024;
    });

    builder.Services.AddIdentityModule(builder.Configuration);
    builder.Services.AddAgricultureInfrastructure(builder.Configuration);
    builder.Services.AddProducersModule();
    builder.Services.AddLandsModule();
    builder.Services.AddSeasonsModule();
    builder.Services.AddWorkflowsModule();
    builder.Services.AddTasksModule();
    builder.Services.AddInspectionsModule();
    builder.Services.AddHarvestModule();
    builder.Services.AddSupportModule();
    builder.Services.AddNotificationsModule();
    builder.Services.AddCommunicationModule();

    builder.Services.AddRateLimiter(options =>
    {
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? httpContext.Request.Headers.Host.ToString(),
                factory: partition => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = 100,
                    QueueLimit = 0,
                    Window = TimeSpan.FromMinutes(1)
                }));
        
        options.OnRejected = async (context, token) =>
        {
            context.HttpContext.Response.StatusCode = 429;
            await context.HttpContext.Response.WriteAsJsonAsync(new { error = "Too many requests. Please try again later." }, cancellationToken: token);
        };
    });

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors("Frontend");
    app.UseRateLimiter();

    // Serve wwwroot except /uploads — evidence/guidance files go through authenticated GET /api/files/...
    app.UseWhen(
        ctx => !ctx.Request.Path.StartsWithSegments("/uploads"),
        branch => branch.UseStaticFiles());

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    await DatabaseInitializer.InitializeAsync(app.Services, app.Environment, app.Configuration);

    app.UseHangfireDashboard("/hangfire", new DashboardOptions
    {
        // For development, allow everyone to see dashboard.
        // In prod, this needs an IDashboardAuthorizationFilter.
        Authorization = new[] { new Hangfire.Dashboard.LocalRequestsOnlyAuthorizationFilter() }
    });

    RecurringJob.AddOrUpdate<Agriculture.Infrastructure.BackgroundJobs.OverdueTaskJob>(
        "check-overdue-tasks",
        job => job.ProcessOverdueTasksAsync(),
        Cron.Daily(9, 0)); // Her gün sabah 09:00'da çalışır

    app.MapHub<NotificationHub>("/hubs/notifications");

    var api = app.MapGroup("/api").WithTags("API");

    api.MapAuthEndpoints();
    api.MapFilesEndpoints();
    api.MapProducersEndpoints();
    api.MapLandsEndpoints();
    api.MapSeasonsEndpoints();
    api.MapWorkflowsEndpoints();
    api.MapTasksEndpoints();
    api.MapCommunicationEndpoints();
    api.MapNotificationsEndpoints();
    api.MapTarimAiIntegrationEndpoints(app.Configuration);
    api.MapInspectionsEndpoints();
    api.MapHarvestEndpoints();
    api.MapSupportEndpoints();
    api.MapDashboardEndpoints();
    app.MapHealthEndpoints();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

internal static class RuntimeConfigGuard
{
    public static void Validate(IHostEnvironment environment, IConfiguration configuration)
    {
        // Development uses appsettings.Development.json (local Docker). Other envs require secrets from env/KeyVault.
        if (environment.IsDevelopment())
            return;

        var cs = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is required outside Development " +
                "(set env ConnectionStrings__DefaultConnection).");
        }

        if (cs.Contains("Your_strong_Password123", StringComparison.Ordinal)
            || cs.Contains("Password=sa", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Refusing to start: DefaultConnection still uses a local/demo SQL password. " +
                "Configure a production connection string via environment variables.");
        }

        var secret = configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
        {
            throw new InvalidOperationException(
                "Jwt:Secret is required (min 32 chars) outside Development (set env Jwt__Secret).");
        }

        if (secret.Contains("ChangeInProduction", StringComparison.OrdinalIgnoreCase)
            || secret.Contains("AgricultureDevSecretKey", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Refusing to start: Jwt:Secret is still a development placeholder.");
        }

        if (configuration.GetValue("Database:SeedDemoData", false))
        {
            throw new InvalidOperationException(
                "Database:SeedDemoData must be false outside Development.");
        }
    }
}

internal static class DashboardCache
{
    public const string SummaryKey = "dashboard:summary";
    private const string GenerationKey = "dashboard:summary:generation";

    public static async Task<int> GetGenerationAsync(ICacheService cache)
    {
        var gen = await cache.GetAsync<int>(GenerationKey);
        return gen;
    }

    public static async Task InvalidateAsync(ICacheService cache)
    {
        await cache.IncrementAsync(GenerationKey);
    }
}

internal static class ProducerAccess
{
    public static async Task<bool> CanAccessAsync(
        IUserContext user,
        Guid producerId,
        AgricultureDbContext db,
        CancellationToken cancellationToken = default)
    {
        if (user.Roles.Contains(AppRoles.Administrator))
            return true;

        if (!user.Roles.Contains(AppRoles.Officer) || user.UserId is null)
            return false;

        return await db.Lands.AsNoTracking()
            .AnyAsync(
                l => l.AssignedOfficerUserId == user.UserId && l.ProducerId == producerId,
                cancellationToken);
    }
}

/// <summary>
/// SDS-R16: land Uyarılar and Bildirimler share the same overdue/missing-step events.
/// Upserts unread in-app notifications for Administrator(s) and assigned Officer.
/// </summary>
internal static class LandAlertNotifications
{
    public static async Task SyncForLandAsync(
        AgricultureDbContext db,
        UserManager<ApplicationUser> userManager,
        Land land,
        IReadOnlyList<(Guid TaskId, string Title, string Message)> alerts,
        CancellationToken cancellationToken = default)
    {
        if (alerts.Count == 0)
            return;

        var recipients = new HashSet<Guid>();
        foreach (var admin in await userManager.GetUsersInRoleAsync(AppRoles.Administrator))
            recipients.Add(admin.Id);
        if (land.AssignedOfficerUserId.HasValue)
            recipients.Add(land.AssignedOfficerUserId.Value);

        if (recipients.Count == 0)
            return;

        foreach (var alert in alerts)
        {
            var title = $"{land.Name} — eksik adım";
            var body = alert.Message;

            foreach (var userId in recipients)
            {
                var exists = await db.Notifications.AnyAsync(n =>
                    n.UserId == userId
                    && n.RelatedEntityType == "Land"
                    && n.RelatedEntityId == land.Id
                    && !n.IsRead
                    && n.Body == body, cancellationToken);

                if (exists)
                    continue;

                await db.Notifications.AddAsync(
                    Notification.Create(
                        userId,
                        title,
                        body,
                        relatedEntityType: "Land",
                        relatedEntityId: land.Id),
                    cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public static async Task SyncAllOverdueAsync(
        AgricultureDbContext db,
        UserManager<ApplicationUser> userManager,
        CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var rows = await (
            from t in db.Tasks.AsNoTracking()
            join l in db.Lands.AsNoTracking() on t.LandId equals l.Id
            where t.Status != ProductionTaskStatus.Completed
                && t.Status != ProductionTaskStatus.Cancelled
                && t.Status != ProductionTaskStatus.AwaitingApproval
                && (t.Status == ProductionTaskStatus.Overdue
                    || (t.DueDate != null && t.DueDate < today))
            select new { Land = l, t.Id, t.Title }).ToListAsync(cancellationToken);

        foreach (var group in rows.GroupBy(r => r.Land.Id))
        {
            var land = group.First().Land;
            var alerts = group
                .Select(g => (g.Id, g.Title, LandAlertCopy.FormatMessage(land.Name, g.Title)))
                .ToList();
            await SyncForLandAsync(db, userManager, land, alerts, cancellationToken);
        }
    }
}

/// <summary>Turkish copy for overdue / missing step alerts (land hub + Bildirimler).</summary>
internal static class LandAlertCopy
{
    public static string FormatMessage(string landName, string taskTitle)
        => $"{landName}: «{PolishTaskTitle(taskTitle)}» adımı gecikti, üreticiden bilgi bekleniyor.";

    /// <summary>Expands informal «foto» to «fotoğraf» and strips smoke «FIX-…» prefixes.</summary>
    public static string PolishTaskTitle(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return title;

        var polished = title.Trim();
        if (polished.StartsWith("FIX-", StringComparison.OrdinalIgnoreCase))
        {
            var space = polished.IndexOf(' ');
            if (space > 0 && space < polished.Length - 1)
                polished = polished[(space + 1)..].Trim();
        }

        if (!polished.Contains("fotoğraf", StringComparison.OrdinalIgnoreCase))
            polished = polished.Replace("foto", "fotoğraf", StringComparison.OrdinalIgnoreCase);

        if (polished.Length > 0)
            polished = char.ToUpper(polished[0], new System.Globalization.CultureInfo("tr-TR")) + polished[1..];

        return polished;
    }
}

internal static class ApiResults
{
    public static IResult From(Result result)
        => result.IsSuccess ? Results.Ok() : Results.BadRequest(new { result.Error.Code, result.Error.Message });

    public static IResult From<T>(Result<T> result)
        => result.IsSuccess
            ? Results.Ok(result.Value)
            : Results.BadRequest(new { result.Error.Code, result.Error.Message });
}


internal static partial class DatabaseInitializer
{
    // Stable demo ids for mobile smoke tests
    public static readonly Guid DemoProducerUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid DemoOfficerUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid DemoOfficer1UserId = Guid.Parse("a2222222-2222-2222-2222-222222222201");
    public static readonly Guid DemoOfficer2UserId = Guid.Parse("a2222222-2222-2222-2222-222222222202");
    public static readonly Guid DemoOfficer3UserId = Guid.Parse("a2222222-2222-2222-2222-222222222203");
    public static readonly Guid DemoProducerId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid DemoLandId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    public static readonly Guid DemoSeasonId = Guid.Parse("66666666-6666-6666-6666-666666666666");
    public static readonly Guid DemoWorkflowTemplateId = Guid.Parse("77777777-7777-7777-7777-777777777777");
    public static readonly Guid DemoProductionWorkflowId = Guid.Parse("55555555-5555-5555-5555-555555555555");

    public static async Task InitializeAsync(
        IServiceProvider services,
        IHostEnvironment environment,
        IConfiguration configuration)
    {
        using var scope = services.CreateScope();
        var identityDb = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var agricultureDb = scope.ServiceProvider.GetRequiredService<AgricultureDbContext>();

        var applyMigrations = configuration.GetValue(
            "Database:ApplyMigrationsOnStartup",
            environment.IsDevelopment());
        var seedDemo = configuration.GetValue(
            "Database:SeedDemoData",
            environment.IsDevelopment());

        if (applyMigrations)
        {
            // Prefer Migrate when migrations exist; fall back to EnsureCreated for greenfield Mac/Docker SQL.
            if (identityDb.Database.GetMigrations().Any())
            {
                await identityDb.Database.MigrateAsync();
                await EnsureIdentityOfficerProfileSchemaAsync(identityDb);
            }
            else
            {
                await identityDb.Database.EnsureCreatedAsync();
                await EnsureIdentityOfficerProfileSchemaAsync(identityDb);
            }

            if (agricultureDb.Database.GetMigrations().Any())
            {
                await agricultureDb.Database.MigrateAsync();
                await EnsureSdsR16SchemaAsync(agricultureDb);
            }
            else
            {
                try
                {
                    var creator = agricultureDb.GetService<IRelationalDatabaseCreator>();
                    await creator.CreateTablesAsync();
                }
                catch (Exception ex) when (ex.Message.Contains("already an object", StringComparison.OrdinalIgnoreCase)
                    || ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase)
                    || ex.InnerException?.Message.Contains("already an object", StringComparison.OrdinalIgnoreCase) == true)
                {
                    // Tables already exist from a previous run.
                }

                // Ensure communication schema tables exist even if agriculture was created earlier.
                await agricultureDb.Database.ExecuteSqlRawAsync("""
                    IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'communication')
                        EXEC('CREATE SCHEMA [communication]');
                    """);
                try
                {
                    await agricultureDb.Database.ExecuteSqlRawAsync("""
                        IF OBJECT_ID(N'communication.Conversations', N'U') IS NULL
                        BEGIN
                            CREATE TABLE [communication].[Conversations] (
                                [Id] uniqueidentifier NOT NULL,
                                [ProducerUserId] uniqueidentifier NOT NULL,
                                [OfficerUserId] uniqueidentifier NULL,
                                [Subject] nvarchar(200) NOT NULL,
                                [Status] int NOT NULL,
                                [LastMessageAtUtc] datetime2 NULL,
                                [CreatedAtUtc] datetime2 NOT NULL,
                                [CreatedBy] nvarchar(max) NULL,
                                [UpdatedAtUtc] datetime2 NULL,
                                [UpdatedBy] nvarchar(max) NULL,
                                [IsDeleted] bit NOT NULL,
                                CONSTRAINT [PK_Conversations] PRIMARY KEY ([Id])
                            );
                        END
                        """);
                    await agricultureDb.Database.ExecuteSqlRawAsync("""
                        IF OBJECT_ID(N'communication.Messages', N'U') IS NULL
                        BEGIN
                            CREATE TABLE [communication].[Messages] (
                                [Id] uniqueidentifier NOT NULL,
                                [ConversationId] uniqueidentifier NOT NULL,
                                [SenderUserId] uniqueidentifier NOT NULL,
                                [Body] nvarchar(4000) NOT NULL,
                                [SentAtUtc] datetime2 NOT NULL,
                                CONSTRAINT [PK_Messages] PRIMARY KEY ([Id]),
                                CONSTRAINT [FK_Messages_Conversations_ConversationId]
                                    FOREIGN KEY ([ConversationId]) REFERENCES [communication].[Conversations] ([Id]) ON DELETE CASCADE
                            );
                        END
                        """);
                }
                catch
                {
                    // Best-effort for EnsureCreated path; migrations preferred when available.
                }

                await EnsureSdsR16SchemaAsync(agricultureDb);
            }
        }
        else
        {
            if (!await agricultureDb.Database.CanConnectAsync())
            {
                throw new InvalidOperationException(
                    "Database unreachable. For Staging/Production apply EF migrations with a migrator job " +
                    "(Database:ApplyMigrationsOnStartup=true once, or `dotnet ef database update`) before starting the API.");
            }
        }

        // Roles are required for auth in every environment (no demo users).
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        if (!seedDemo)
            return;

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await EnsureUserAsync(userManager, "admin@agriculture.local", "Admin123!", "System", "Administrator",
            AppRoles.Administrator, null);
        await EnsureUserAsync(userManager, "uzman@agriculture.local", "Officer123!", "Ayşe", "Uzman",
            AppRoles.Officer, DemoOfficerUserId, phone: "05551112233",
            specialization: "Bitki Koruma Uzmanı", neighborhood: "Değirmiçem", isActive: true);
        await EnsureUserAsync(userManager, "uzman1@agriculture.local", "Officer123!", "Mehmet", "Yıldız",
            AppRoles.Officer, DemoOfficer1UserId, phone: "05551112201",
            specialization: "Bitki Koruma Uzmanı", neighborhood: "Değirmiçem", isActive: true);
        await EnsureUserAsync(userManager, "uzman2@agriculture.local", "Officer123!", "Elif", "Kara",
            AppRoles.Officer, DemoOfficer2UserId, phone: "05551112202",
            specialization: "Toprak ve Sulama Uzmanı", neighborhood: "İbrahimli", isActive: true);
        await EnsureUserAsync(userManager, "uzman3@agriculture.local", "Officer123!", "Can", "Özer",
            AppRoles.Officer, DemoOfficer3UserId, phone: "05551112203",
            specialization: "Hasat ve Kalite Uzmanı", neighborhood: "Mücahitler", isActive: true);
        await EnsureUserAsync(userManager, "uretici@agriculture.local", "asd", "Mehmet", "Çiftçi",
            AppRoles.Producer, DemoProducerUserId, phone: "5537472823");
        await EnsureUserAsync(userManager, "denetci@agriculture.local", "Inspector123!", "Ali", "Denetçi",
            AppRoles.Inspector, null);

        await SeedDemoAgricultureDataAsync(agricultureDb, DemoProducerUserId);
    }

    /// <summary>Idempotent officer profile columns for migrate / EnsureCreated paths.</summary>
    private static async Task EnsureIdentityOfficerProfileSchemaAsync(IdentityDbContext db)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH(N'identity.AspNetUsers', N'Specialization') IS NULL
                    ALTER TABLE [identity].[AspNetUsers] ADD [Specialization] nvarchar(200) NULL;
                IF COL_LENGTH(N'identity.AspNetUsers', N'Neighborhood') IS NULL
                    ALTER TABLE [identity].[AspNetUsers] ADD [Neighborhood] nvarchar(200) NULL;
                """);
        }
        catch
        {
            // Best-effort schema patch.
        }
    }

    /// <summary>Idempotent SDS-R16 columns for migrate / EnsureCreated paths.</summary>
    private static async Task EnsureSdsR16SchemaAsync(AgricultureDbContext db)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH(N'agriculture.Lands', N'AssignedOfficerUserId') IS NULL
                    ALTER TABLE [agriculture].[Lands] ADD [AssignedOfficerUserId] uniqueidentifier NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Lands_AssignedOfficerUserId' AND object_id = OBJECT_ID(N'agriculture.Lands'))
                    CREATE INDEX [IX_Lands_AssignedOfficerUserId] ON [agriculture].[Lands]([AssignedOfficerUserId]);
                IF OBJECT_ID(N'agriculture.LandNotes', N'U') IS NULL
                BEGIN
                    CREATE TABLE [agriculture].[LandNotes] (
                        [Id] uniqueidentifier NOT NULL,
                        [LandId] uniqueidentifier NOT NULL,
                        [AuthorUserId] uniqueidentifier NOT NULL,
                        [Body] nvarchar(4000) NOT NULL,
                        [CreatedAtUtc] datetime2 NOT NULL,
                        CONSTRAINT [PK_LandNotes] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_LandNotes_LandId] ON [agriculture].[LandNotes]([LandId]);
                END
                IF OBJECT_ID(N'agriculture.ProducerNotes', N'U') IS NULL
                BEGIN
                    CREATE TABLE [agriculture].[ProducerNotes] (
                        [Id] uniqueidentifier NOT NULL,
                        [ProducerId] uniqueidentifier NOT NULL,
                        [AuthorUserId] uniqueidentifier NOT NULL,
                        [Body] nvarchar(4000) NOT NULL,
                        [CreatedAtUtc] datetime2 NOT NULL,
                        CONSTRAINT [PK_ProducerNotes] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_ProducerNotes_ProducerId] ON [agriculture].[ProducerNotes]([ProducerId]);
                END
                IF COL_LENGTH(N'communication.Conversations', N'LandId') IS NULL
                    ALTER TABLE [communication].[Conversations] ADD [LandId] uniqueidentifier NULL;
                IF COL_LENGTH(N'communication.Conversations', N'AdminUserId') IS NULL
                    ALTER TABLE [communication].[Conversations] ADD [AdminUserId] uniqueidentifier NULL;
                IF COL_LENGTH(N'communication.Conversations', N'Type') IS NULL
                    ALTER TABLE [communication].[Conversations] ADD [Type] int NOT NULL CONSTRAINT [DF_Conversations_Type] DEFAULT 0;
                IF COL_LENGTH(N'agriculture.HarvestRecords', N'BuyerName') IS NULL
                    ALTER TABLE [agriculture].[HarvestRecords] ADD [BuyerName] nvarchar(200) NULL;
                IF COL_LENGTH(N'agriculture.HarvestRecords', N'UnitPrice') IS NULL
                    ALTER TABLE [agriculture].[HarvestRecords] ADD [UnitPrice] decimal(18,2) NULL;
                IF COL_LENGTH(N'agriculture.HarvestRecords', N'TotalAmount') IS NULL
                    ALTER TABLE [agriculture].[HarvestRecords] ADD [TotalAmount] decimal(18,2) NULL;
                IF COL_LENGTH(N'agriculture.WorkflowSteps', N'VideoUrl') IS NULL
                    ALTER TABLE [agriculture].[WorkflowSteps] ADD [VideoUrl] nvarchar(500) NULL;
                IF COL_LENGTH(N'agriculture.WorkflowSteps', N'ImageUrl') IS NULL
                    ALTER TABLE [agriculture].[WorkflowSteps] ADD [ImageUrl] nvarchar(500) NULL;
                IF COL_LENGTH(N'agriculture.Tasks', N'VideoUrl') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [VideoUrl] nvarchar(500) NULL;
                IF COL_LENGTH(N'agriculture.Tasks', N'ImageUrl') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [ImageUrl] nvarchar(500) NULL;
                IF COL_LENGTH(N'agriculture.Tasks', N'RevisionReason') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [RevisionReason] nvarchar(1000) NULL;
                IF COL_LENGTH(N'agriculture.Tasks', N'Theme') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [Theme] nvarchar(32) NULL;
                IF COL_LENGTH(N'agriculture.Tasks', N'EvidenceJson') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [EvidenceJson] nvarchar(max) NULL;
                IF COL_LENGTH(N'agriculture.Tasks', N'PlannedEvidenceJson') IS NULL
                    ALTER TABLE [agriculture].[Tasks] ADD [PlannedEvidenceJson] nvarchar(max) NULL;
                IF COL_LENGTH(N'agriculture.WorkflowSteps', N'Theme') IS NULL
                    ALTER TABLE [agriculture].[WorkflowSteps] ADD [Theme] nvarchar(32) NULL;
                IF COL_LENGTH(N'agriculture.WorkflowSteps', N'PlannedEvidenceJson') IS NULL
                    ALTER TABLE [agriculture].[WorkflowSteps] ADD [PlannedEvidenceJson] nvarchar(max) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_ProducerId_Status' AND object_id = OBJECT_ID(N'agriculture.Tasks'))
                    CREATE INDEX [IX_Tasks_ProducerId_Status] ON [agriculture].[Tasks]([ProducerId], [Status]);
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Tasks_LandId_Status' AND object_id = OBJECT_ID(N'agriculture.Tasks'))
                    CREATE INDEX [IX_Tasks_LandId_Status] ON [agriculture].[Tasks]([LandId], [Status]);
                IF OBJECT_ID(N'agriculture.DevicePushTokens', N'U') IS NULL
                BEGIN
                    CREATE TABLE [agriculture].[DevicePushTokens] (
                        [Id] uniqueidentifier NOT NULL,
                        [UserId] uniqueidentifier NOT NULL,
                        [Token] nvarchar(500) NOT NULL,
                        [Platform] nvarchar(32) NOT NULL,
                        [LastSeenAtUtc] datetime2 NOT NULL,
                        [CreatedAtUtc] datetime2 NOT NULL,
                        [CreatedBy] nvarchar(max) NULL,
                        [UpdatedAtUtc] datetime2 NULL,
                        [UpdatedBy] nvarchar(max) NULL,
                        [IsDeleted] bit NOT NULL CONSTRAINT [DF_DevicePushTokens_IsDeleted] DEFAULT 0,
                        CONSTRAINT [PK_DevicePushTokens] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_DevicePushTokens_UserId] ON [agriculture].[DevicePushTokens]([UserId]);
                    CREATE UNIQUE INDEX [IX_DevicePushTokens_Token] ON [agriculture].[DevicePushTokens]([Token]);
                END
                IF COL_LENGTH(N'agriculture.DevicePushTokens', N'Token') IS NOT NULL
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DevicePushTokens_Token' AND object_id = OBJECT_ID(N'agriculture.DevicePushTokens'))
                        DROP INDEX [IX_DevicePushTokens_Token] ON [agriculture].[DevicePushTokens];
                    ALTER TABLE [agriculture].[DevicePushTokens] ALTER COLUMN [Token] nvarchar(2000) NOT NULL;
                    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DevicePushTokens_Token' AND object_id = OBJECT_ID(N'agriculture.DevicePushTokens'))
                        CREATE INDEX [IX_DevicePushTokens_Token] ON [agriculture].[DevicePushTokens]([Token]);
                END
                """);
        }
        catch
        {
            // Best-effort schema patch.
        }
    }

    private static async Task EnsureUserAsync(
        UserManager<ApplicationUser> userManager,
        string email,
        string password,
        string firstName,
        string lastName,
        string role,
        Guid? fixedId,
        string? phone = null,
        string? specialization = null,
        string? neighborhood = null,
        bool? isActive = null)
    {
        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null)
        {
            // Keep demo credentials / officer profile in sync across restarts.
            var dirty = false;
            if (phone is not null && existing.PhoneNumber != phone)
            {
                existing.PhoneNumber = phone;
                dirty = true;
            }
            if (specialization is not null && existing.Specialization != specialization)
            {
                existing.Specialization = specialization;
                dirty = true;
            }
            if (neighborhood is not null && existing.Neighborhood != neighborhood)
            {
                existing.Neighborhood = neighborhood;
                dirty = true;
            }
            if (isActive.HasValue && existing.IsActive != isActive.Value)
            {
                existing.IsActive = isActive.Value;
                dirty = true;
            }
            if (dirty)
                await userManager.UpdateAsync(existing);

            if (!await userManager.CheckPasswordAsync(existing, password))
            {
                var token = await userManager.GeneratePasswordResetTokenAsync(existing);
                await userManager.ResetPasswordAsync(existing, token, password);
            }
            return;
        }

        var user = new ApplicationUser
        {
            Id = fixedId ?? Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = firstName,
            LastName = lastName,
            PhoneNumber = phone,
            Specialization = specialization,
            Neighborhood = neighborhood,
            IsActive = isActive ?? true
        };

        var created = await userManager.CreateAsync(user, password);
        if (created.Succeeded)
            await userManager.AddToRoleAsync(user, role);
    }

    private static async Task SeedDemoAgricultureDataAsync(AgricultureDbContext db, Guid producerUserId)
    {
        if (!await db.Producers.AnyAsync(p => p.Id == DemoProducerId))
        {
            var producer = Producer.Create(
                "Mehmet", "Çiftçi", "12345678901", "5537472823",
                "uretici@agriculture.local", "Şehitkamil / Değirmiçem", producerUserId);
            SetEntityId(producer, DemoProducerId);
            await db.Producers.AddAsync(producer);
        }
        else
        {
            var existingProducer = await db.Producers.FirstOrDefaultAsync(p => p.Id == DemoProducerId);
            existingProducer?.Update("Mehmet", "Çiftçi", "5537472823", "uretici@agriculture.local", "Şehitkamil / Değirmiçem");
        }

        // Demo field near Şehitkamil / Gaziantep — visible with SK-DEMO markers on ops map.
        const double DemoLatitude = 37.0825;
        const double DemoLongitude = 37.3550;
        const string DemoNeighborhood = "Değirmiçem";

        if (!await db.Lands.AnyAsync(l => l.Id == DemoLandId))
        {
            var land = Land.Create(
                "Şehitkamil Demo Tarlası", "P-001", 12.5m,
                latitude: DemoLatitude,
                longitude: DemoLongitude,
                city: "Gaziantep", district: "Şehitkamil", neighborhood: DemoNeighborhood);
            land.AssignProducer(DemoProducerId);
            land.AssignOfficer(DemoOfficerUserId);
            SetEntityId(land, DemoLandId);
            await db.Lands.AddAsync(land);
        }
        else
        {
            // SDS-R16 + Şehitkamil demo: keep demo land assigned and on the Gaziantep map cluster.
            var existingLand = await db.Lands.FirstOrDefaultAsync(l => l.Id == DemoLandId);
            if (existingLand is not null)
            {
                if (existingLand.AssignedOfficerUserId is null)
                    existingLand.AssignOfficer(DemoOfficerUserId);
                if (existingLand.ProducerId is null)
                    existingLand.AssignProducer(DemoProducerId);

                // Force Gaziantep coords so the marker is not left in old Konya seed data.
                // Rename legacy English/dev labels to Turkish display names.
                var displayName = existingLand.Name == "Demo Tarla"
                    ? "Şehitkamil Demo Tarlası"
                    : existingLand.Name;
                existingLand.Update(
                    displayName,
                    existingLand.ParcelNumber,
                    existingLand.SizeInDecares,
                    existingLand.CadastralBlock,
                    DemoNeighborhood,
                    DemoLatitude,
                    DemoLongitude,
                    existingLand.SoilType,
                    existingLand.SoilNotes);
            }
        }

        if (!await db.Seasons.AnyAsync(s => s.Id == DemoSeasonId))
        {
            var season = Season.Create(
                "2026 Yaz Sezonu",
                2026,
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-14)),
                "Demo üretim sezonu");
            season.Start();
            SetEntityId(season, DemoSeasonId);
            await db.Seasons.AddAsync(season);
        }

        if (!await db.Workflows.AnyAsync(w => w.Id == DemoWorkflowTemplateId))
        {
            var workflow = Workflow.Create(
                "Domates üretim akışı",
                "Demo belediye iş akışı",
                cropType: "Domates");
            SetEntityId(workflow, DemoWorkflowTemplateId);
            workflow.AddStep("Sulama kontrolü", "Tarla sulama durumunu kontrol edin.", 1, dueDaysFromStart: 0);
            workflow.AddStep("Yaprak kontrolü", "Yaprak sağlığı fotoğrafı çekin.", 2, dueDaysFromStart: 7, requiresPhoto: true);
            workflow.Activate();
            await db.Workflows.AddAsync(workflow);
        }

        if (!await db.ProductionWorkflows.AnyAsync(pw => pw.Id == DemoProductionWorkflowId))
        {
            var assignment = ProductionWorkflow.Assign(
                DemoSeasonId, DemoWorkflowTemplateId, DemoProducerId, DemoLandId);
            assignment.Start();
            SetEntityId(assignment, DemoProductionWorkflowId);
            await db.ProductionWorkflows.AddAsync(assignment);
        }

        // Persist core demo graph before open-task ensure (AnyAsync hits the database).
        await db.SaveChangesAsync();

        await EnsureOpenDemoTasksAsync(db, producerUserId);

        // SDS-R16: ensure at least one overdue alert on demo land for ops/land hub smoke
        if (!await db.Tasks.AnyAsync(t =>
                t.LandId == DemoLandId
                && t.Title == "Can suyu verildi"
                && t.Status != ProductionTaskStatus.Completed))
        {
            var overdue = ProductionTask.Create(
                DemoProductionWorkflowId,
                DemoProducerId,
                DemoLandId,
                "Can suyu verildi",
                "Can suyu uygulandığını bildirin.",
                dueDate: DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-3)),
                requiresPhoto: false);
            await db.Tasks.AddAsync(overdue);
        }

        if (!await db.Notifications.AnyAsync(n => n.UserId == producerUserId))
        {
            await db.Notifications.AddAsync(Notification.Create(
                producerUserId,
                "Bugünün görevleri hazır",
                "İki açık göreviniz var. Bugünün görevleri ekranından devam edin."));
            await db.Notifications.AddAsync(Notification.Create(
                producerUserId,
                "Hatırlatma",
                "Fotoğraf gerektiren görevleri tamamlamadan önce kanıt yükleyin."));
        }

        if (!await db.Notifications.AnyAsync(n => n.UserId == DemoOfficerUserId))
        {
            await db.Notifications.AddAsync(Notification.Create(
                DemoOfficerUserId,
                "Operasyon Merkezi",
                "Bugün için açık görev ve denetimleri Operasyon Merkezi’nden izleyin."));
        }

        if (!await db.Inspections.AnyAsync())
        {
            var todaySeed = DateOnly.FromDateTime(DateTime.UtcNow);
            await db.Inspections.AddAsync(Inspection.Create(
                DemoLandId,
                DemoProducerId,
                DemoOfficerUserId,
                "Hasat öncesi saha kontrolü",
                todaySeed,
                "Demo denetim kaydı"));
            await db.Inspections.AddAsync(Inspection.Create(
                DemoLandId,
                DemoProducerId,
                DemoOfficer1UserId,
                "Bitki sağlığı kontrolü",
                todaySeed,
                "Demo denetim — uzman1"));
            await db.Inspections.AddAsync(Inspection.Create(
                DemoLandId,
                DemoProducerId,
                DemoOfficer2UserId,
                "Sulama sistemi denetimi",
                todaySeed,
                "Demo denetim — uzman2"));
        }

        await EnsureTodaysDemoInspectionsAsync(db);

        await db.SaveChangesAsync();

        // Şehitkamil (Gaziantep) rich map demo — idempotent via SK-DEMO-01…15 parcels.
        await SeedSehitkamilDemoDataAsync(db);

        // Rename leftover English/dev smoke labels so they never appear in the UI.
        await SanitizeDevLandDisplayNamesAsync(db);
    }

    /// <summary>
    /// Keeps at least one today-scheduled inspection per active demo officer (Uzmanlar aggregates).
    /// </summary>
    private static async Task EnsureTodaysDemoInspectionsAsync(AgricultureDbContext db)
    {
        if (!await db.Lands.AnyAsync(l => l.Id == DemoLandId))
            return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var officers = new[] { DemoOfficerUserId, DemoOfficer1UserId, DemoOfficer2UserId };
        foreach (var officerId in officers)
        {
            var hasToday = await db.Inspections.AnyAsync(i =>
                i.InspectorUserId == officerId && i.ScheduledDate == today);
            if (hasToday)
                continue;

            await db.Inspections.AddAsync(Inspection.Create(
                DemoLandId,
                DemoProducerId,
                officerId,
                "Günlük saha denetimi",
                today,
                "Demo — bugünkü denetim"));
        }
    }

    /// <summary>
    /// Idempotent rename of known English/test land (and informal task) labels left by smoke scripts.
    /// </summary>
    private static async Task SanitizeDevLandDisplayNamesAsync(AgricultureDbContext db)
    {
        var landRenames = new Dictionary<string, (string Name, string? Parcel)>(StringComparer.OrdinalIgnoreCase)
        {
            ["Officer Workflow Land"] = ("Meram Demo Tarlası", "MR-DEMO-01"),
            ["QA Test Arazi"] = ("QA Deneme Arazi", null),
            ["Smoke Mahalle Arazi"] = ("Yeşilova Demo Tarlası", null),
            ["Test Mahalle Arazi"] = ("Yeşilova Deneme Tarlası", null),
            ["Demo Tarla"] = ("Şehitkamil Demo Tarlası", null),
            ["UI QA 083021"] = ("UI Deneme Arazi", null),
        };

        var lands = await db.Lands.ToListAsync();
        foreach (var land in lands)
        {
            if (land.ParcelNumber.Equals("OW-1", StringComparison.OrdinalIgnoreCase)
                && !landRenames.ContainsKey(land.Name))
            {
                SetLandDisplay(land, "Meram Demo Tarlası", "MR-DEMO-01");
                continue;
            }

            if (!landRenames.TryGetValue(land.Name, out var rename))
                continue;

            SetLandDisplay(land, rename.Name, rename.Parcel);
        }

        var tasks = await db.Tasks
            .Where(t => t.Title.StartsWith("FIX-")
                || (t.Title.Contains("foto") && !t.Title.Contains("fotoğraf")))
            .ToListAsync();
        foreach (var task in tasks)
        {
            var polished = LandAlertCopy.PolishTaskTitle(task.Title);
            if (!string.Equals(polished, task.Title, StringComparison.Ordinal))
                SetPrivateString(task, nameof(ProductionTask.Title), polished);
        }

        var workflows = await db.Workflows
            .Where(w => w.Name.Contains("FIX-") || w.Name.EndsWith(" workflow"))
            .ToListAsync();
        foreach (var workflow in workflows)
        {
            var name = workflow.Name
                .Replace(" workflow", " iş akışı", StringComparison.OrdinalIgnoreCase)
                .Trim();
            if (name.StartsWith("FIX-", StringComparison.OrdinalIgnoreCase))
                name = "Deneme iş akışı";
            if (!string.Equals(name, workflow.Name, StringComparison.Ordinal))
                SetPrivateString(workflow, nameof(Workflow.Name), name);
        }

        var steps = await db.WorkflowSteps
            .Where(s => s.Name.Contains("foto") && !s.Name.Contains("fotoğraf"))
            .ToListAsync();
        foreach (var step in steps)
        {
            var polished = LandAlertCopy.PolishTaskTitle(step.Name);
            if (!string.Equals(polished, step.Name, StringComparison.Ordinal))
                SetPrivateString(step, nameof(WorkflowStep.Name), polished);
        }

        await db.SaveChangesAsync();
    }

    private static void SetLandDisplay(Land land, string name, string? parcelNumber)
    {
        SetPrivateString(land, nameof(Land.Name), name);
        if (!string.IsNullOrWhiteSpace(parcelNumber))
            SetPrivateString(land, nameof(Land.ParcelNumber), parcelNumber);
    }

    private static void SetPrivateString(object entity, string propertyName, string value)
    {
        entity.GetType().GetProperty(propertyName)!.SetValue(entity, value);
        if (entity is Agriculture.SharedKernel.Primitives.AuditableEntity auditable)
        {
            typeof(Agriculture.SharedKernel.Primitives.AuditableEntity)
                .GetProperty(nameof(Agriculture.SharedKernel.Primitives.AuditableEntity.UpdatedAtUtc))!
                .SetValue(auditable, DateTime.UtcNow);
        }
    }

    /// <summary>
    /// Ensures the demo producer always has two open today-tasks for mobile walkthroughs.
    /// Safe to call repeatedly (no-op when open tasks already exist).
    /// </summary>
    public static async Task EnsureOpenDemoTasksAsync(AgricultureDbContext db, Guid producerUserId)
    {
        if (!await db.ProductionWorkflows.AnyAsync(pw => pw.Id == DemoProductionWorkflowId))
            return;

        await using var tx = await db.Database.BeginTransactionAsync();

        var hadAnyTasks = await db.Tasks.AnyAsync(t => t.ProducerId == DemoProducerId);
        var hasOpenToday = await db.Tasks.AnyAsync(t =>
            t.ProducerId == DemoProducerId
            && (t.Status == ProductionTaskStatus.Pending
                || t.Status == ProductionTaskStatus.InProgress
                || t.Status == ProductionTaskStatus.Overdue));

        if (hasOpenToday)
        {
            await EnsureDemoOverdueAlertTaskAsync(db);
            await tx.CommitAsync();
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var task1 = ProductionTask.Create(
            DemoProductionWorkflowId, DemoProducerId, DemoLandId,
            "Sulama kontrolü", "Bugün tarlayı kontrol edin ve sulama durumunu bildirin.",
            dueDate: today, requiresPhoto: false);
        var task2 = ProductionTask.Create(
            DemoProductionWorkflowId, DemoProducerId, DemoLandId,
            "Yaprak fotoğrafı", "Bitki sağlığı için yakın çekim yaprak fotoğrafı çekin.",
            dueDate: today, requiresPhoto: true);
        // SDS-R16 demo: one overdue step so land Uyarılar + Bildirimler light up
        var task3 = ProductionTask.Create(
            DemoProductionWorkflowId, DemoProducerId, DemoLandId,
            "Can suyu verildi", "Can suyu uygulamasını bildirin.",
            dueDate: today.AddDays(-2), requiresPhoto: false);
        await db.Tasks.AddRangeAsync(task1, task2, task3);

        if (hadAnyTasks)
        {
            await db.Notifications.AddAsync(Notification.Create(
                producerUserId,
                "Yeni görevler atandı",
                "Bugün için iki yeni göreviniz var.",
                relatedEntityType: "ProductionWorkflow",
                relatedEntityId: DemoProductionWorkflowId));
        }

        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    /// <summary>Ensures a single overdue "Can suyu" task exists for SDS-R16 alert demos.</summary>
    private static async Task EnsureDemoOverdueAlertTaskAsync(AgricultureDbContext db)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hasOverdue = await db.Tasks.AnyAsync(t =>
            t.LandId == DemoLandId
            && t.Status != ProductionTaskStatus.Completed
            && t.Status != ProductionTaskStatus.Cancelled
            && t.Status != ProductionTaskStatus.AwaitingApproval
            && (t.Status == ProductionTaskStatus.Overdue
                || (t.DueDate != null && t.DueDate < today)));

        if (hasOverdue)
            return;

        await db.Tasks.AddAsync(ProductionTask.Create(
            DemoProductionWorkflowId, DemoProducerId, DemoLandId,
            "Can suyu verildi", "Can suyu uygulamasını bildirin.",
            dueDate: today.AddDays(-2), requiresPhoto: false));
        await db.SaveChangesAsync();
    }

    private static void SetEntityId(Agriculture.SharedKernel.Primitives.Entity entity, Guid id)
        => typeof(Agriculture.SharedKernel.Primitives.Entity)
            .GetProperty(nameof(Agriculture.SharedKernel.Primitives.Entity.Id))!
            .SetValue(entity, id);
}
