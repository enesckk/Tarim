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
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.FileProviders;
using Microsoft.OpenApi.Models;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy =>
            policy.WithOrigins(
                    builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                    ??
                    [
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "http://localhost:8081",
                        "http://127.0.0.1:8081"
                    ])
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
    });

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

    Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads"));

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors("Frontend");

    var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads");
    Directory.CreateDirectory(uploadsRoot);
    app.UseStaticFiles();
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(uploadsRoot),
        RequestPath = "/uploads"
    });

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    await DatabaseInitializer.InitializeAsync(app.Services);

    var api = app.MapGroup("/api").WithTags("API");

    // Auth
    var auth = api.MapGroup("/auth").WithTags("Auth");
    auth.MapPost("/login", async (LoginCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command)));
    auth.MapPost("/register", async (RegisterUserCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
    auth.MapPost("/refresh", async (RefreshTokenCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command)));

    // Me (producer profile baseline)
    api.MapGet("/me", async (IUserContext user, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var producer = await db.Producers.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == user.UserId);

        return Results.Ok(new
        {
            user.UserId,
            user.Email,
            Roles = user.Roles,
            ProducerId = producer?.Id,
            FullName = producer?.FullName,
            Phone = producer?.Phone
        });
    }).WithTags("Identity").RequireAuthorization();

    // Producers
    var producers = api.MapGroup("/producers").WithTags("Producers").RequireAuthorization();
    producers.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var result = await sender.Send(new GetProducersQuery());
        if (!result.IsSuccess)
            return ApiResults.From(result);

        var isOfficerOnly = user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator);
        if (!isOfficerOnly)
            return ApiResults.From(result);

        var linkedIds = await db.Lands.AsNoTracking()
            .Where(l => l.AssignedOfficerUserId == user.UserId && l.ProducerId != null)
            .Select(l => l.ProducerId!.Value)
            .Distinct()
            .ToListAsync();

        return Results.Ok(result.Value.Where(p => linkedIds.Contains(p.Id)).ToList());
    });
    producers.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        if (!await ProducerAccess.CanAccessAsync(user, id, db))
            return Results.Forbid();

        return ApiResults.From(await sender.Send(new GetProducerByIdQuery(id)));
    });
    producers.MapGet("/{id:guid}/notes", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        if (!await ProducerAccess.CanAccessAsync(user, id, db))
            return Results.Forbid();

        var producer = await db.Producers.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        if (producer is null)
            return Results.NotFound(new { Code = "Producer.NotFound", Message = "Üretici bulunamadı." });

        return ApiResults.From(await sender.Send(new GetProducerNotesQuery(id)));
    });
    producers.MapPost("/{id:guid}/notes", async (
        Guid id,
        AddProducerNoteBody body,
        IUserContext user,
        ISender sender,
        AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        if (!await ProducerAccess.CanAccessAsync(user, id, db))
            return Results.Forbid();

        return ApiResults.From(await sender.Send(new AddProducerNoteCommand(id, user.UserId.Value, body.Body)));
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    producers.MapPost("/", async (RegisterProducerCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Staff directory
    api.MapGet("/staff/officers", async (UserManager<ApplicationUser> userManager) =>
    {
        var officers = await userManager.GetUsersInRoleAsync(AppRoles.Officer);
        return Results.Ok(officers.Select(u => new
        {
            u.Id,
            u.Email,
            FullName = $"{u.FirstName} {u.LastName}".Trim(),
            PhoneNumber = u.PhoneNumber
        }));
    }).WithTags("Staff").RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));

    // Lands — hub of operations (SDS-R15 / SDS-R16)
    var lands = api.MapGroup("/lands").WithTags("Lands").RequireAuthorization();
    lands.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        Guid? officerFilter = user.Roles.Contains(AppRoles.Administrator)
            ? null
            : user.Roles.Contains(AppRoles.Officer) ? user.UserId : null;

        var result = await sender.Send(new GetLandsQuery(officerFilter));
        if (!result.IsSuccess)
            return ApiResults.From(result);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var landIds = result.Value.Select(l => l.Id).ToList();
        var alertCounts = await db.Tasks.AsNoTracking()
            .Where(t => landIds.Contains(t.LandId)
                && t.Status != ProductionTaskStatus.Completed
                && t.Status != ProductionTaskStatus.Cancelled
                && (t.Status == ProductionTaskStatus.Overdue
                    || (t.DueDate != null && t.DueDate < today)))
            .GroupBy(t => t.LandId)
            .Select(g => new { LandId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.LandId, x => x.Count);

        var activeProductions = await (
            from pw in db.ProductionWorkflows.AsNoTracking()
            join w in db.Workflows.AsNoTracking() on pw.WorkflowId equals w.Id
            where landIds.Contains(pw.LandId)
                && (pw.Status == ProductionWorkflowStatus.InProgress
                    || pw.Status == ProductionWorkflowStatus.NotStarted)
            select new { pw.LandId, w.Name, w.CropType, pw.StartedAtUtc }
        ).ToListAsync();

        var activeByLand = activeProductions
            .GroupBy(x => x.LandId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.StartedAtUtc).First());

        var mapStatuses = await LandMapStatus.ComputeAsync(db, landIds);

        var enriched = result.Value.Select(l =>
        {
            alertCounts.TryGetValue(l.Id, out var alerts);
            activeByLand.TryGetValue(l.Id, out var active);
            mapStatuses.TryGetValue(l.Id, out var mapStatus);
            return new LandDto(
                l.Id, l.Name, l.ParcelNumber, l.SizeInDecares, l.Latitude, l.Longitude,
                l.SoilType, l.ProducerId, l.AssignedOfficerUserId, l.IsActive,
                alerts,
                active?.CropType,
                active?.Name,
                l.Neighborhood,
                l.CadastralBlock,
                l.SoilNotes,
                mapStatus ?? LandMapStatus.Normal);
        }).ToList();

        return Results.Ok(enriched);
    });
    lands.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var result = await sender.Send(new GetLandByIdQuery(id));
        if (!result.IsSuccess)
            return Results.NotFound(new { Code = result.Error.Code, Message = result.Error.Message });

        var land = result.Value;
        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var alertCount = await db.Tasks.AsNoTracking()
            .CountAsync(t => t.LandId == id
                && t.Status != ProductionTaskStatus.Completed
                && t.Status != ProductionTaskStatus.Cancelled
                && (t.Status == ProductionTaskStatus.Overdue
                    || (t.DueDate != null && t.DueDate < today)));

        var active = await (
            from pw in db.ProductionWorkflows.AsNoTracking()
            join w in db.Workflows.AsNoTracking() on pw.WorkflowId equals w.Id
            where pw.LandId == id
                && (pw.Status == ProductionWorkflowStatus.InProgress
                    || pw.Status == ProductionWorkflowStatus.NotStarted)
            orderby pw.StartedAtUtc descending
            select new
            {
                pw.Id,
                pw.SeasonId,
                pw.WorkflowId,
                WorkflowName = w.Name,
                w.CropType,
                Status = (int)pw.Status,
                pw.CurrentStepOrder,
                pw.ProducerId
            }
        ).FirstOrDefaultAsync();

        var mapStatuses = await LandMapStatus.ComputeAsync(db, [id]);
        mapStatuses.TryGetValue(id, out var mapStatus);

        return Results.Ok(new
        {
            land.Id,
            land.Name,
            land.ParcelNumber,
            land.SizeInDecares,
            land.Latitude,
            land.Longitude,
            land.SoilType,
            land.SoilNotes,
            land.Neighborhood,
            land.CadastralBlock,
            land.ProducerId,
            land.AssignedOfficerUserId,
            land.IsActive,
            AlertCount = alertCount,
            ActiveCropType = active?.CropType,
            ActiveWorkflowName = active?.WorkflowName,
            ActiveProduction = active,
            MapStatus = mapStatus ?? LandMapStatus.Normal
        });
    });
    lands.MapPost("/", async (RegisterLandCommand command, ISender sender, IMemoryCache cache) =>
    {
        var result = await sender.Send(command);
        if (result.IsSuccess)
            DashboardCache.Invalidate(cache);
        return ApiResults.From(result);
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    lands.MapPut("/{id:guid}", async (
        Guid id,
        UpdateLandBody body,
        IUserContext user,
        ISender sender,
        AgricultureDbContext db,
        IMemoryCache cache) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        var result = await sender.Send(new UpdateLandCommand(
            id,
            body.Name,
            body.SizeInDecares,
            body.Latitude,
            body.Longitude,
            body.SoilType,
            body.SoilNotes));
        if (result.IsSuccess)
            DashboardCache.Invalidate(cache);
        return ApiResults.From(result);
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    lands.MapPost("/{id:guid}/assign-producer", async (Guid id, AssignLandProducerBody body, ISender sender) =>
        ApiResults.From(await sender.Send(new AssignLandProducerCommand(id, body.ProducerId))))
        .RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
    lands.MapPut("/{id:guid}/assignments", async (Guid id, AssignLandAssignmentsBody body, ISender sender) =>
        ApiResults.From(await sender.Send(new AssignLandAssignmentsCommand(id, body.ProducerId, body.OfficerUserId))))
        .RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
    lands.MapGet("/{id:guid}/alerts", async (
        Guid id,
        IUserContext user,
        AgricultureDbContext db,
        UserManager<ApplicationUser> userManager) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var overdueRows = await db.Tasks.AsNoTracking()
            .Where(t => t.LandId == id
                && t.Status != ProductionTaskStatus.Completed
                && t.Status != ProductionTaskStatus.Cancelled
                && (t.Status == ProductionTaskStatus.Overdue
                    || (t.DueDate != null && t.DueDate < today)))
            .OrderBy(t => t.DueDate)
            .Select(t => new { t.Id, t.Title, t.DueDate, Status = (int)t.Status })
            .ToListAsync();

        var alerts = overdueRows.Select(t => new
        {
            t.Id,
            Title = LandAlertCopy.PolishTaskTitle(t.Title),
            t.DueDate,
            t.Status,
            Message = LandAlertCopy.FormatMessage(land.Name, t.Title),
            LandId = land.Id,
            LandName = land.Name,
            ParcelNumber = land.ParcelNumber
        }).ToList();

        // Same alert class → Bildirimler inbox for admin + assigned uzman
        await LandAlertNotifications.SyncForLandAsync(db, userManager, land, alerts.Select(a => (a.Id, a.Title, a.Message)).ToList());

        return Results.Ok(alerts);
    });
    lands.MapGet("/{id:guid}/notes", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        return ApiResults.From(await sender.Send(new GetLandNotesQuery(id)));
    });
    lands.MapPost("/{id:guid}/notes", async (
        Guid id,
        AddLandNoteBody body,
        IUserContext user,
        ISender sender,
        AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        return ApiResults.From(await sender.Send(new AddLandNoteCommand(id, user.UserId.Value, body.Body)));
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    lands.MapGet("/{id:guid}/productions", async (Guid id, IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        return ApiResults.From(await sender.Send(new GetLandProductionsQuery(id)));
    });
    lands.MapGet("/{id:guid}/conversations", async (Guid id, IUserContext user, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        var items = await db.Conversations.AsNoTracking()
            .Include(c => c.Messages)
            .Where(c => !c.IsDeleted
                && c.LandId == id
                && c.Type == ConversationType.Expert)
            .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
            .ToListAsync();

        return Results.Ok(items.Select(c =>
        {
            var last = c.Messages.OrderByDescending(m => m.SentAtUtc).FirstOrDefault();
            return new
            {
                c.Id,
                c.Subject,
                LastMessagePreview = last?.Body,
                LastMessageAtUtc = c.LastMessageAtUtc ?? last?.SentAtUtc,
                Status = (int)c.Status,
                Type = (int)c.Type,
                c.LandId,
                c.OfficerUserId,
                c.AdminUserId,
                c.ProducerUserId
            };
        }));
    });
    // Land hub chat: reply on producer↔uzman thread (SDS-R16 message placement)
    lands.MapPost("/{id:guid}/conversations/{conversationId:guid}/messages", async (
        Guid id,
        Guid conversationId,
        IUserContext user,
        [FromBody] SendMessageRequest body,
        ISender sender,
        AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (land is null)
            return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });

        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator)
            && land.AssignedOfficerUserId != user.UserId)
            return Results.Forbid();

        var conversation = await db.Conversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId && !c.IsDeleted);
        if (conversation is null
            || conversation.LandId != id
            || conversation.Type != ConversationType.Expert)
            return Results.BadRequest(new { Code = "Conversation.NotLandThread", Message = "Bu sohbet arazi üretici kanalına ait değil." });

        var staffAccess = user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer);
        return ApiResults.From(await sender.Send(new SendMessageCommand(
            conversationId, user.UserId.Value, body.Body, staffAccess)));
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Staff directory (officers for land assignment)
    api.MapGet("/users/officers", async (UserManager<ApplicationUser> userManager) =>
    {
        var officers = await userManager.GetUsersInRoleAsync(AppRoles.Officer);
        return Results.Ok(officers.Select(u => new
        {
            u.Id,
            u.Email,
            FullName = $"{u.FirstName} {u.LastName}".Trim(),
            u.PhoneNumber
        }));
    }).WithTags("Identity").RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    api.MapGet("/users/admins", async (UserManager<ApplicationUser> userManager) =>
    {
        var admins = await userManager.GetUsersInRoleAsync(AppRoles.Administrator);
        return Results.Ok(admins.Select(u => new
        {
            u.Id,
            u.Email,
            FullName = $"{u.FirstName} {u.LastName}".Trim()
        }));
    }).WithTags("Identity").RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Seasons
    var seasons = api.MapGroup("/seasons").WithTags("Seasons").RequireAuthorization();
    seasons.MapGet("/", async (ISender sender) => ApiResults.From(await sender.Send(new GetSeasonsQuery())));
    seasons.MapPost("/", async (CreateSeasonCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    seasons.MapPost("/{id:guid}/start", async (Guid id, ISender sender) =>
        ApiResults.From(await sender.Send(new StartSeasonCommand(id)))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Workflows
    var workflows = api.MapGroup("/workflows").WithTags("Workflows").RequireAuthorization();
    workflows.MapGet("/", async (ISender sender) => ApiResults.From(await sender.Send(new GetWorkflowsQuery())));
    workflows.MapPost("/", async (CreateWorkflowCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    workflows.MapPut("/{id:guid}", async (Guid id, UpdateWorkflowBody body, ISender sender) =>
        ApiResults.From(await sender.Send(new UpdateWorkflowCommand(
            id, body.Name, body.Description, body.CropType, body.Steps))))
        .RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    workflows.MapPost("/assign", async (
        AssignProductionWorkflowCommand command,
        IUserContext user,
        ISender sender,
        AgricultureDbContext db,
        IMemoryCache cache) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        // Admin: any land. Officer: only assigned lands (must not be blocked from land-hub flow).
        if (user.Roles.Contains(AppRoles.Officer)
            && !user.Roles.Contains(AppRoles.Administrator))
        {
            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == command.LandId);
            if (land is null)
                return Results.NotFound(new { Code = "Land.NotFound", Message = "Arazi bulunamadı." });
            if (land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();
        }

        var result = await sender.Send(command);
        if (!result.IsSuccess)
            return ApiResults.From(result);

        // Critical linkage: assignment must materialize producer tasks from workflow steps.
        var workflow = await db.Workflows.AsNoTracking()
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == command.WorkflowId);
        if (workflow is not null && workflow.Steps.Count > 0)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var tasksToCreate = workflow.Steps
                .OrderBy(s => s.Order)
                .Select(step => ProductionTask.Create(
                    result.Value,
                    command.ProducerId,
                    command.LandId,
                    step.Name,
                    step.Description,
                    step.Id,
                    step.DueDaysFromStart is int days ? today.AddDays(days) : today,
                    step.RequiresPhoto,
                    step.RequiresQuantity,
                    step.RequiresDate,
                    step.QuantityUnit))
                .ToList();
            await db.Tasks.AddRangeAsync(tasksToCreate);
            await db.SaveChangesAsync();

            // Keep land's current producer in sync with this production (SDS-R15).
            var land = await db.Lands.FirstOrDefaultAsync(l => l.Id == command.LandId);
            if (land is not null)
            {
                land.AssignProducer(command.ProducerId);
                await db.SaveChangesAsync();
            }
        }

        DashboardCache.Invalidate(cache);
        return Results.Ok(result.Value);
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    workflows.MapPut("/productions/{id:guid}/producer", async (
        Guid id,
        ReassignProductionProducerBody body,
        ISender sender,
        AgricultureDbContext db,
        IMemoryCache cache) =>
    {
        var result = await sender.Send(new ReassignProductionProducerCommand(id, body.ProducerId));
        if (!result.IsSuccess)
            return ApiResults.From(result);

        var production = await db.ProductionWorkflows.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);
        if (production is not null)
        {
            var openTasks = await db.Tasks
                .Where(t => t.ProductionWorkflowId == id
                    && (t.Status == ProductionTaskStatus.Pending
                        || t.Status == ProductionTaskStatus.InProgress
                        || t.Status == ProductionTaskStatus.Overdue))
                .ToListAsync();
            foreach (var task in openTasks)
                task.ReassignProducer(body.ProducerId);

            var land = await db.Lands.FirstOrDefaultAsync(l => l.Id == production.LandId);
            land?.AssignProducer(body.ProducerId);

            await db.SaveChangesAsync();
        }

        DashboardCache.Invalidate(cache);
        return Results.Ok();
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Tasks
    var tasks = api.MapGroup("/tasks").WithTags("Tasks").RequireAuthorization();
    tasks.MapGet("/", async ([FromQuery] Guid? producerId, ISender sender) =>
        ApiResults.From(await sender.Send(new GetTasksQuery(producerId))));
    tasks.MapGet("/today", async (IUserContext user, AgricultureDbContext db, ISender sender, IMemoryCache cache) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        var producer = await db.Producers.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == user.UserId);
        if (producer is null)
            return Results.Ok(Array.Empty<object>());

        // Demo resilience: seed only runs at startup; re-stock open tasks after walkthrough completion.
        if (producer.Id == DatabaseInitializer.DemoProducerId)
        {
            var before = await db.Tasks.CountAsync(t =>
                t.ProducerId == DatabaseInitializer.DemoProducerId
                && (t.Status == ProductionTaskStatus.Pending
                    || t.Status == ProductionTaskStatus.InProgress
                    || t.Status == ProductionTaskStatus.Overdue));
            await DatabaseInitializer.EnsureOpenDemoTasksAsync(db, user.UserId.Value);
            var after = await db.Tasks.CountAsync(t =>
                t.ProducerId == DatabaseInitializer.DemoProducerId
                && (t.Status == ProductionTaskStatus.Pending
                    || t.Status == ProductionTaskStatus.InProgress
                    || t.Status == ProductionTaskStatus.Overdue));
            if (after != before)
                DashboardCache.Invalidate(cache);
        }

        return ApiResults.From(await sender.Send(new GetTodayTasksQuery(producer.Id)));
    });
    tasks.MapGet("/{id:guid}", async (Guid id, ISender sender) =>
        ApiResults.From(await sender.Send(new GetTaskByIdQuery(id))));
    tasks.MapPost("/", async (CreateTaskCommand command, ISender sender, IMemoryCache cache) =>
    {
        var result = await sender.Send(command);
        if (result.IsSuccess)
            DashboardCache.Invalidate(cache);
        return ApiResults.From(result);
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    // Photo upload: multipart file → local disk (wwwroot/uploads). MinIO optional later.
    // Also accepts JSON metadata / base64 for curl smoke tests.
    tasks.MapPost("/{id:guid}/photos", async (Guid id, HttpRequest request, IWebHostEnvironment env, ISender sender, IMemoryCache cache) =>
    {
        try
        {
            var saved = await TaskPhotoStorage.SaveAsync(id, request, env);
            if (saved is null)
                return Results.BadRequest(new { Code = "Photo.Missing", Message = "Fotoğraf dosyası gerekli." });

            var result = await sender.Send(new AddTaskPhotoCommand(
                id,
                saved.StorageKey,
                saved.FileName,
                saved.ContentType));
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Photo upload failed for task {TaskId}", id);
            return Results.BadRequest(new { Code = "Photo.UploadFailed", Message = "Fotoğraf yüklenemedi." });
        }
    }).DisableAntiforgery();
    tasks.MapPost("/{id:guid}/complete", async (Guid id, [FromBody] CompleteTaskRequest? body, ISender sender, IMemoryCache cache) =>
    {
        var result = await sender.Send(new CompleteTaskCommand(id, body?.Notes));
        if (result.IsSuccess)
            DashboardCache.Invalidate(cache);
        return ApiResults.From(result);
    });
    // Conversations — staff panel = Admin↔Uzman only; producer chat lives on land hub (SDS-R16)
    var conversations = api.MapGroup("/conversations").WithTags("Communication").RequireAuthorization();
    conversations.MapGet("/", async (IUserContext user, ISender sender, AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        // Staff Mesajlar panel: Staff-type threads only (never producer land chat)
        if (user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer))
        {
            var staffResult = user.Roles.Contains(AppRoles.Administrator)
                ? await sender.Send(new GetStaffConversationsQuery())
                : await sender.Send(new GetStaffConversationsQuery(user.UserId));

            if (!staffResult.IsSuccess)
                return ApiResults.From(staffResult);

            var staffOnly = staffResult.Value
                .Where(c => c.Type == ConversationType.Staff)
                .ToList();
            return Results.Ok(staffOnly);
        }

        // Producer mobile: expert threads
        return ApiResults.From(await sender.Send(new GetConversationsQuery(user.UserId.Value)));
    });
    conversations.MapPost("/ask-expert", async (
        IUserContext user,
        [FromBody] AskExpertRequest? body,
        ISender sender,
        AgricultureDbContext db) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        Guid? landId = body?.LandId;
        Guid? officerUserId = null;

        if (landId.HasValue)
        {
            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == landId.Value);
            officerUserId = land?.AssignedOfficerUserId;
        }
        else
        {
            // Resolve from producer → land assignment when land not specified
            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId.Value);
            if (producer is not null)
            {
                var assignedLand = await db.Lands.AsNoTracking()
                    .Where(l => l.ProducerId == producer.Id && l.AssignedOfficerUserId != null)
                    .OrderBy(l => l.Name)
                    .FirstOrDefaultAsync();
                if (assignedLand is not null)
                {
                    landId = assignedLand.Id;
                    officerUserId = assignedLand.AssignedOfficerUserId;
                }
            }
        }

        officerUserId ??= DatabaseInitializer.DemoOfficerUserId;

        return ApiResults.From(await sender.Send(new AskExpertCommand(
            user.UserId.Value,
            body?.Subject,
            officerUserId,
            landId)));
    });
    conversations.MapPost("/staff", async (
        IUserContext user,
        [FromBody] StartStaffConversationRequest? body,
        ISender sender,
        UserManager<ApplicationUser> userManager) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        Guid adminUserId;
        Guid officerUserId;

        if (user.Roles.Contains(AppRoles.Administrator))
        {
            adminUserId = user.UserId.Value;
            if (body?.OfficerUserId is null)
                return Results.BadRequest(new { Code = "Staff.OfficerRequired", Message = "Uzman seçilmelidir." });
            officerUserId = body.OfficerUserId.Value;
        }
        else if (user.Roles.Contains(AppRoles.Officer))
        {
            officerUserId = user.UserId.Value;
            if (body?.AdminUserId is not null)
            {
                adminUserId = body.AdminUserId.Value;
            }
            else
            {
                var admins = await userManager.GetUsersInRoleAsync(AppRoles.Administrator);
                var admin = admins.FirstOrDefault();
                if (admin is null)
                    return Results.BadRequest(new { Code = "Staff.AdminMissing", Message = "Yönetici hesabı bulunamadı." });
                adminUserId = admin.Id;
            }
        }
        else
        {
            return Results.Forbid();
        }

        return ApiResults.From(await sender.Send(new StartStaffConversationCommand(
            adminUserId,
            officerUserId,
            body?.Subject)));
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    conversations.MapGet("/{id:guid}", async (Guid id, IUserContext user, ISender sender) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();
        var staffAccess = user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer);
        return ApiResults.From(await sender.Send(new GetConversationMessagesQuery(id, user.UserId.Value, staffAccess)));
    });
    conversations.MapPost("/{id:guid}/messages", async (Guid id, IUserContext user, [FromBody] SendMessageRequest body, ISender sender) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();
        var staffAccess = user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer);
        return ApiResults.From(await sender.Send(new SendMessageCommand(id, user.UserId.Value, body.Body, staffAccess)));
    });

    // Notifications — includes land alert mirrors (SDS-R16)
    var notifications = api.MapGroup("/notifications").WithTags("Notifications").RequireAuthorization();
    notifications.MapGet("/", async (
        IUserContext user,
        ISender sender,
        AgricultureDbContext db,
        UserManager<ApplicationUser> userManager) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        if (user.Roles.Contains(AppRoles.Administrator) || user.Roles.Contains(AppRoles.Officer))
            await LandAlertNotifications.SyncAllOverdueAsync(db, userManager);

        return ApiResults.From(await sender.Send(new GetNotificationsQuery(user.UserId.Value)));
    });

    // Inspections — Officer may create/list for assigned lands (SDS-R16)
    var inspections = api.MapGroup("/inspections").WithTags("Inspections").RequireAuthorization();
    inspections.MapGet("/", async (
        [FromQuery] Guid? inspectorUserId,
        [FromQuery] Guid? landId,
        IUserContext user,
        ISender sender,
        AgricultureDbContext db) =>
    {
        var result = await sender.Send(new GetInspectionsQuery(inspectorUserId));
        if (!result.IsSuccess)
            return ApiResults.From(result);

        var items = result.Value.AsEnumerable();
        if (landId.HasValue)
            items = items.Where(i => i.LandId == landId.Value);

        if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator) && user.UserId is not null)
        {
            var officerLandIds = await db.Lands.AsNoTracking()
                .Where(l => l.AssignedOfficerUserId == user.UserId)
                .Select(l => l.Id)
                .ToListAsync();
            items = items.Where(i => officerLandIds.Contains(i.LandId));
        }

        return Results.Ok(items.ToList());
    });
    inspections.MapPost("/", async (CreateInspectionCommand command, IUserContext user, AgricultureDbContext db, ISender sender) =>
    {
        if (user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator) && user.UserId is not null)
        {
            var land = await db.Lands.AsNoTracking().FirstOrDefaultAsync(l => l.Id == command.LandId);
            if (land is null || land.AssignedOfficerUserId != user.UserId)
                return Results.Forbid();
        }
        return ApiResults.From(await sender.Send(command));
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    inspections.MapPost("/{id:guid}/complete", async (Guid id, CompleteInspectionRequest body, ISender sender) =>
        ApiResults.From(await sender.Send(new CompleteInspectionCommand(id, body.Result, body.Report))));

    // Harvest (+ Delivery owned by Harvest module — SDS-R01)
    var harvest = api.MapGroup("/harvest").WithTags("Harvest").RequireAuthorization();
    harvest.MapGet("/", async (ISender sender) => ApiResults.From(await sender.Send(new GetHarvestsQuery())));
    harvest.MapPost("/", async (RecordHarvestCommand command, ISender sender, IMemoryCache cache) =>
    {
        var result = await sender.Send(command);
        if (result.IsSuccess)
            DashboardCache.Invalidate(cache);
        return ApiResults.From(result);
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));
    harvest.MapGet("/deliveries", async (AgricultureDbContext db) =>
    {
        var items = await db.DeliveryRecords.AsNoTracking()
            .OrderByDescending(d => d.DeliveryDate)
            .Select(d => new
            {
                d.Id,
                d.HarvestRecordId,
                d.ProducerId,
                d.Quantity,
                d.Unit,
                d.DeliveryDate,
                d.Destination,
                d.Notes
            })
            .ToListAsync();
        return Results.Ok(items);
    });
    harvest.MapPost("/deliveries", async (
        RecordDeliveryRequest body,
        AgricultureDbContext db,
        IMemoryCache cache) =>
    {
        var harvestRecord = await db.HarvestRecords.FirstOrDefaultAsync(h => h.Id == body.HarvestRecordId);
        if (harvestRecord is null)
            return Results.BadRequest(new { Code = "Delivery.HarvestNotFound", Message = "Hasat kaydı bulunamadı." });

        var delivered = await db.DeliveryRecords
            .Where(d => d.HarvestRecordId == body.HarvestRecordId)
            .SumAsync(d => (decimal?)d.Quantity) ?? 0m;
        var remaining = harvestRecord.Quantity - delivered;
        if (body.Quantity <= 0 || body.Quantity > remaining)
            return Results.BadRequest(new { Code = "Delivery.QuantityInvalid", Message = $"Teslimat miktarı 0 ile {remaining} arasında olmalıdır." });

        var delivery = DeliveryRecord.Create(
            body.HarvestRecordId,
            harvestRecord.ProducerId,
            body.Quantity,
            body.DeliveryDate,
            string.IsNullOrWhiteSpace(body.Unit) ? harvestRecord.Unit : body.Unit!,
            body.Destination,
            body.Notes);
        await db.DeliveryRecords.AddAsync(delivery);
        await db.SaveChangesAsync();
        DashboardCache.Invalidate(cache);
        return Results.Ok(delivery.Id);
    }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Support
    var support = api.MapGroup("/support").WithTags("Support").RequireAuthorization();
    support.MapGet("/programs", async (ISender sender) => ApiResults.From(await sender.Send(new GetSupportProgramsQuery())));
    support.MapPost("/programs", async (CreateSupportProgramCommand command, ISender sender) =>
        ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator, AppRoles.Officer));

    // Operations Center summary (IMemoryCache hot path — SDS-R11)
    api.MapGet("/dashboard", async (
        IUserContext user,
        AgricultureDbContext db,
        IMemoryCache cache,
        UserManager<ApplicationUser> userManager) =>
    {
        if (user.UserId is null)
            return Results.Unauthorized();

        // Keep Bildirimler in sync with land overdue/missing steps
        await LandAlertNotifications.SyncAllOverdueAsync(db, userManager);

        var cacheKey = $"{DashboardCache.SummaryKey}:v{DashboardCache.Generation}:map1:{user.UserId}";
        if (cache.TryGetValue(cacheKey, out object? cached) && cached is not null)
            return Results.Ok(cached);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var isOfficerOnly = user.Roles.Contains(AppRoles.Officer) && !user.Roles.Contains(AppRoles.Administrator);

        IQueryable<ProductionTask> scopedTasks = db.Tasks.AsNoTracking();
        IQueryable<Inspection> scopedInspections = db.Inspections.AsNoTracking();
        IQueryable<Land> scopedLands = db.Lands.AsNoTracking();
        if (isOfficerOnly)
        {
            var officerLandIds = db.Lands.AsNoTracking()
                .Where(l => l.AssignedOfficerUserId == user.UserId)
                .Select(l => l.Id);
            scopedTasks = scopedTasks.Where(t => officerLandIds.Contains(t.LandId));
            scopedInspections = scopedInspections.Where(i => officerLandIds.Contains(i.LandId));
            scopedLands = scopedLands.Where(l => l.AssignedOfficerUserId == user.UserId);
        }

        IQueryable<ProductionTask> overdueQuery = scopedTasks.Where(t =>
            t.Status == ProductionTaskStatus.Overdue
            || (t.DueDate < today
                && (t.Status == ProductionTaskStatus.Pending || t.Status == ProductionTaskStatus.InProgress)));

        var overdueCount = await overdueQuery.CountAsync();
        var overdueTasks = await overdueQuery
            .OrderBy(t => t.DueDate)
            .Select(t => new { t.Id, t.Title, t.ProducerId, t.LandId, t.DueDate, Status = (int)t.Status })
            .ToListAsync();

        var overdueLandIds = overdueTasks.Select(t => t.LandId).Distinct().ToList();
        var landLookup = await db.Lands.AsNoTracking()
            .Where(l => overdueLandIds.Contains(l.Id))
            .ToDictionaryAsync(l => l.Id, l => new { l.Name, l.ParcelNumber });

        var landAlerts = overdueTasks.Select(t =>
        {
            landLookup.TryGetValue(t.LandId, out var land);
            var landLabel = land is null ? "Arazi" : land.Name;
            var polishedTitle = LandAlertCopy.PolishTaskTitle(t.Title);
            return new
            {
                t.Id,
                Title = polishedTitle,
                t.LandId,
                LandName = land?.Name,
                ParcelNumber = land?.ParcelNumber,
                t.DueDate,
                t.Status,
                Message = LandAlertCopy.FormatMessage(landLabel, polishedTitle)
            };
        }).ToList();

        var tasksDueToday = await scopedTasks
            .Where(t => t.DueDate == today
                && (t.Status == ProductionTaskStatus.Pending
                    || t.Status == ProductionTaskStatus.InProgress
                    || t.Status == ProductionTaskStatus.Overdue))
            .OrderBy(t => t.Title)
            .Take(8)
            .Select(t => new { t.Id, t.Title, t.ProducerId, t.LandId, t.DueDate, Status = (int)t.Status })
            .ToListAsync();

        var pendingInspectionQuery = scopedInspections
            .Where(i => i.Status == InspectionStatus.Scheduled || i.Status == InspectionStatus.InProgress);
        var openInspectionCount = await pendingInspectionQuery.CountAsync();
        var pendingInspections = await pendingInspectionQuery
            .OrderBy(i => i.ScheduledDate)
            .Take(8)
            .Select(i => new
            {
                i.Id,
                i.Title,
                i.ProducerId,
                i.LandId,
                i.ScheduledDate,
                Status = (int)i.Status
            })
            .ToListAsync();

        var harvests = await db.HarvestRecords.AsNoTracking()
            .OrderByDescending(h => h.HarvestDate)
            .Take(12)
            .ToListAsync();
        var harvestIds = harvests.Select(h => h.Id).ToList();
        var deliverySums = await db.DeliveryRecords.AsNoTracking()
            .Where(d => harvestIds.Contains(d.HarvestRecordId))
            .GroupBy(d => d.HarvestRecordId)
            .Select(g => new { HarvestRecordId = g.Key, Delivered = g.Sum(x => x.Quantity) })
            .ToListAsync();
        var deliveredMap = deliverySums.ToDictionary(x => x.HarvestRecordId, x => x.Delivered);
        var harvestPipeline = harvests.Select(h =>
        {
            deliveredMap.TryGetValue(h.Id, out var delivered);
            return new
            {
                h.Id,
                h.ProductName,
                h.ProducerId,
                h.Quantity,
                h.Unit,
                h.HarvestDate,
                DeliveredQuantity = delivered,
                RemainingQuantity = h.Quantity - delivered
            };
        }).ToList();

        var unreadNotifications = await db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == user.UserId.Value && !n.IsRead);
        var openConversations = isOfficerOnly
            ? await db.Conversations.AsNoTracking()
                .CountAsync(c => c.Status == ConversationStatus.Open && c.OfficerUserId == user.UserId)
            : await db.Conversations.AsNoTracking()
                .CountAsync(c => c.Status == ConversationStatus.Open);

        var activeWorkflows = await db.ProductionWorkflows.AsNoTracking()
            .CountAsync(pw => (pw.Status == ProductionWorkflowStatus.InProgress
                || pw.Status == ProductionWorkflowStatus.NotStarted)
                && (!isOfficerOnly || scopedLands.Select(l => l.Id).Contains(pw.LandId)));

        var recentActivity = new List<(DateTime At, string Kind, string Title, Guid RefId)>();

        var completedTasks = await scopedTasks
            .Where(t => t.CompletedAtUtc != null)
            .OrderByDescending(t => t.CompletedAtUtc)
            .Take(5)
            .Select(t => new { At = t.CompletedAtUtc!.Value, t.Title, RefId = t.Id })
            .ToListAsync();
        recentActivity.AddRange(completedTasks.Select(t => (t.At, "task", t.Title, t.RefId)));

        var inspectionRows = await scopedInspections
            .OrderByDescending(i => i.UpdatedAtUtc ?? i.CreatedAtUtc)
            .Take(5)
            .Select(i => new { At = i.UpdatedAtUtc ?? i.CreatedAtUtc, i.Title, RefId = i.Id })
            .ToListAsync();
        recentActivity.AddRange(inspectionRows.Select(i => (i.At, "inspection", i.Title, i.RefId)));

        var harvestRows = await db.HarvestRecords.AsNoTracking()
            .OrderByDescending(h => h.CreatedAtUtc)
            .Take(5)
            .Select(h => new { At = h.CreatedAtUtc, Title = h.ProductName, RefId = h.Id })
            .ToListAsync();
        recentActivity.AddRange(harvestRows.Select(h => (h.At, "harvest", h.Title, h.RefId)));

        var messageRows = await db.ChatMessages.AsNoTracking()
            .OrderByDescending(m => m.SentAtUtc)
            .Take(5)
            .Select(m => new { m.SentAtUtc, m.Body, m.ConversationId })
            .ToListAsync();
        recentActivity.AddRange(messageRows.Select(m => (
            m.SentAtUtc,
            "message",
            m.Body.Length > 80 ? m.Body[..80] + "…" : m.Body,
            m.ConversationId)));

        var recentActivityDto = recentActivity
            .OrderByDescending(a => a.At)
            .Take(12)
            .Select(a => new { a.At, a.Kind, a.Title, a.RefId })
            .ToList();

        var mapLandRows = await scopedLands
            .Where(l => l.IsActive && l.Latitude != null && l.Longitude != null)
            .Select(l => new
            {
                l.Id,
                l.Name,
                Latitude = l.Latitude!.Value,
                Longitude = l.Longitude!.Value,
                l.Neighborhood,
                l.District,
                l.ParcelNumber
            })
            .ToListAsync();
        // Operasyon haritası: Şehitkamil odaklı (ilçe adı veya koordinat kutusu)
        mapLandRows = mapLandRows
            .Where(l =>
                string.Equals(l.District, "Şehitkamil", StringComparison.OrdinalIgnoreCase)
                || (l.Latitude is >= 36.99 and <= 37.17 && l.Longitude is >= 37.28 and <= 37.50))
            .ToList();
        var mapLandIds = mapLandRows.Select(l => l.Id).ToList();
        var mapStatuses = await LandMapStatus.ComputeAsync(db, mapLandIds);
        var mapLands = mapLandRows.Select(l =>
        {
            mapStatuses.TryGetValue(l.Id, out var status);
            return new
            {
                l.Id,
                l.Name,
                l.Latitude,
                l.Longitude,
                l.Neighborhood,
                l.District,
                l.ParcelNumber,
                MapStatus = status ?? LandMapStatus.Normal
            };
        }).ToList();

        var summary = new
        {
            Producers = await db.Producers.CountAsync(),
            Lands = await scopedLands.CountAsync(),
            ActiveSeasons = await db.Seasons.CountAsync(s => s.Status == Agriculture.Modules.Seasons.Domain.Entities.SeasonStatus.Active),
            PendingTasks = await scopedTasks.CountAsync(t => t.Status == ProductionTaskStatus.Pending
                || t.Status == ProductionTaskStatus.InProgress),
            OverdueTasks = overdueCount,
            OpenInspections = openInspectionCount,
            HarvestRecords = await db.HarvestRecords.CountAsync(),
            ActiveProductionWorkflows = activeWorkflows,
            UnreadNotifications = unreadNotifications,
            OpenConversations = openConversations,
            TasksDueToday = tasksDueToday,
            OverdueTaskItems = overdueTasks,
            LandAlerts = landAlerts,
            PendingInspectionItems = pendingInspections,
            HarvestPipeline = harvestPipeline,
            RecentActivity = recentActivityDto,
            MapLands = mapLands
        };

        cache.Set(cacheKey, summary, TimeSpan.FromSeconds(30));
        return Results.Ok(summary);
    }).WithTags("Dashboard").RequireAuthorization();

    app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "Agriculture.Api" }));

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

internal static class DashboardCache
{
    public const string SummaryKey = "dashboard:summary";
    private static int _generation;

    public static int Generation => Volatile.Read(ref _generation);

    public static void Invalidate(IMemoryCache cache)
    {
        _ = cache;
        Interlocked.Increment(ref _generation);
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

internal sealed record CompleteTaskRequest(string? Notes);
internal sealed record CompleteInspectionRequest(InspectionResult Result, string Report);
internal sealed record RecordDeliveryRequest(
    Guid HarvestRecordId,
    decimal Quantity,
    DateOnly DeliveryDate,
    string? Unit,
    string? Destination,
    string? Notes);
internal sealed record AddTaskPhotoRequest(
    string? StorageKey,
    string? FileName,
    string? ContentType,
    string? Base64Content = null);
internal sealed record AskExpertRequest(string? Subject, Guid? LandId = null);
internal sealed record StartStaffConversationRequest(Guid? OfficerUserId, Guid? AdminUserId, string? Subject);
internal sealed record SendMessageRequest(string Body);
internal sealed record UpdateWorkflowBody(
    string Name,
    string? Description,
    string? CropType,
    IReadOnlyList<Agriculture.Modules.Workflows.Application.Commands.CreateWorkflow.WorkflowStepInput> Steps);

internal sealed record AssignLandProducerBody(Guid ProducerId);
internal sealed record AssignLandAssignmentsBody(Guid? ProducerId, Guid? OfficerUserId);
internal sealed record UpdateLandBody(
    string Name,
    decimal SizeInDecares,
    double? Latitude,
    double? Longitude,
    string? SoilType,
    string? SoilNotes);
internal sealed record AddLandNoteBody(string Body);
internal sealed record AddProducerNoteBody(string Body);

internal sealed record ReassignProductionProducerBody(Guid ProducerId);

internal sealed record SavedTaskPhoto(string StorageKey, string FileName, string ContentType);

internal static class TaskPhotoStorage
{
    public static async Task<SavedTaskPhoto?> SaveAsync(Guid taskId, HttpRequest request, IWebHostEnvironment env)
    {
        if (request.HasFormContentType)
        {
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
            if (file is null || file.Length == 0)
                return null;

            return await WriteFileAsync(taskId, env, file.OpenReadStream(), file.FileName, file.ContentType);
        }

        var body = await request.ReadFromJsonAsync<AddTaskPhotoRequest>();
        if (body is null)
            return null;

        if (!string.IsNullOrWhiteSpace(body.Base64Content))
        {
            var bytes = Convert.FromBase64String(body.Base64Content);
            await using var stream = new MemoryStream(bytes);
            return await WriteFileAsync(
                taskId,
                env,
                stream,
                body.FileName ?? "photo.jpg",
                body.ContentType ?? "image/jpeg");
        }

        // Metadata-only fallback (still persists TaskPhoto so RequiresPhoto complete works).
        var key = string.IsNullOrWhiteSpace(body.StorageKey)
            ? $"uploads/tasks/{taskId:N}/{Guid.NewGuid():N}.jpg"
            : body.StorageKey!;
        return new SavedTaskPhoto(
            key,
            body.FileName ?? "photo.jpg",
            body.ContentType ?? "image/jpeg");
    }

    private static async Task<SavedTaskPhoto> WriteFileAsync(
        Guid taskId,
        IWebHostEnvironment env,
        Stream content,
        string? originalFileName,
        string? contentType)
    {
        var safeName = Path.GetFileName(string.IsNullOrWhiteSpace(originalFileName) ? "photo.jpg" : originalFileName);
        var ext = Path.GetExtension(safeName);
        if (string.IsNullOrWhiteSpace(ext))
            ext = ".jpg";

        var folder = Path.Combine(env.ContentRootPath, "wwwroot", "uploads", "tasks", taskId.ToString("N"));
        Directory.CreateDirectory(folder);

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(folder, storedName);
        await using (var fs = File.Create(fullPath))
            await content.CopyToAsync(fs);

        var storageKey = $"uploads/tasks/{taskId:N}/{storedName}";
        return new SavedTaskPhoto(
            storageKey,
            safeName,
            string.IsNullOrWhiteSpace(contentType) ? "image/jpeg" : contentType);
    }
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

    public static async Task InitializeAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var identityDb = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
        var agricultureDb = scope.ServiceProvider.GetRequiredService<AgricultureDbContext>();

        // Prefer Migrate when migrations exist; fall back to EnsureCreated for greenfield Mac/Docker SQL.
        if (identityDb.Database.GetMigrations().Any())
            await identityDb.Database.MigrateAsync();
        else
            await identityDb.Database.EnsureCreatedAsync();

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

        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        await EnsureUserAsync(userManager, "admin@agriculture.local", "Admin123!", "System", "Administrator",
            AppRoles.Administrator, null);
        await EnsureUserAsync(userManager, "uzman@agriculture.local", "Officer123!", "Ayşe", "Uzman",
            AppRoles.Officer, DemoOfficerUserId, phone: "05551112233");
        await EnsureUserAsync(userManager, "uzman1@agriculture.local", "Officer123!", "Mehmet", "Yıldız",
            AppRoles.Officer, DemoOfficer1UserId, phone: "05551112201");
        await EnsureUserAsync(userManager, "uzman2@agriculture.local", "Officer123!", "Elif", "Kara",
            AppRoles.Officer, DemoOfficer2UserId, phone: "05551112202");
        await EnsureUserAsync(userManager, "uzman3@agriculture.local", "Officer123!", "Can", "Özer",
            AppRoles.Officer, DemoOfficer3UserId, phone: "05551112203");
        await EnsureUserAsync(userManager, "uretici@agriculture.local", "Producer123!", "Mehmet", "Çiftçi",
            AppRoles.Producer, DemoProducerUserId, phone: "05559876543");
        await EnsureUserAsync(userManager, "denetci@agriculture.local", "Inspector123!", "Ali", "Denetçi",
            AppRoles.Inspector, null);

        await SeedDemoAgricultureDataAsync(agricultureDb, DemoProducerUserId);
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
        string? phone = null)
    {
        if (await userManager.FindByEmailAsync(email) is not null)
            return;

        var user = new ApplicationUser
        {
            Id = fixedId ?? Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = firstName,
            LastName = lastName,
            PhoneNumber = phone,
            IsActive = true
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
                "Mehmet", "Çiftçi", "12345678901", "05559876543",
                "uretici@agriculture.local", "Demo mahalle", producerUserId);
            SetEntityId(producer, DemoProducerId);
            await db.Producers.AddAsync(producer);
        }

        // Demo field near Şehitkamil / Gaziantep — visible with SK-DEMO markers on ops map.
        const double DemoLatitude = 37.0825;
        const double DemoLongitude = 37.3550;

        if (!await db.Lands.AnyAsync(l => l.Id == DemoLandId))
        {
            var land = Land.Create(
                "Şehitkamil Demo Tarlası", "P-001", 12.5m,
                latitude: DemoLatitude,
                longitude: DemoLongitude,
                city: "Gaziantep", district: "Şehitkamil", neighborhood: "Demo mahalle");
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
                    existingLand.SizeInDecares,
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
            await db.Inspections.AddAsync(Inspection.Create(
                DemoLandId,
                DemoProducerId,
                DemoOfficerUserId,
                "Hasat öncesi saha kontrolü",
                DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(2)),
                "Demo denetim kaydı"));
        }

        await db.SaveChangesAsync();

        // Şehitkamil (Gaziantep) rich map demo — idempotent via SK-DEMO-01…15 parcels.
        await SeedSehitkamilDemoDataAsync(db);

        // Rename leftover English/dev smoke labels so they never appear in the UI.
        await SanitizeDevLandDisplayNamesAsync(db);
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
