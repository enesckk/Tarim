using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Notifications.Application.Commands.MarkNotificationRead;
using Agriculture.Modules.Notifications.Application.Queries.GetNotifications;
using Agriculture.Modules.Notifications.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Agriculture.Application.Abstractions.Caching;

internal static class NotificationsEndpoints
{
    public static RouteGroupBuilder MapNotificationsEndpoints(this RouteGroupBuilder api)
    {
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
        notifications.MapPost("/{id:guid}/read", async (Guid id, IUserContext user, ISender sender, ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            var result = await sender.Send(new MarkNotificationReadCommand(id, user.UserId.Value));
            if (result.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(result);
        });
        notifications.MapPost("/read-all", async (IUserContext user, ISender sender, ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            var result = await sender.Send(new MarkAllNotificationsReadCommand(user.UserId.Value));
            if (result.IsSuccess)
                await DashboardCache.InvalidateAsync(cache);
            return ApiResults.From(result);
        });
        notifications.MapDelete("/{id:guid}", async (Guid id, IUserContext user, AgricultureDbContext db, ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == user.UserId.Value);
            if (notification is not null)
            {
                db.Notifications.Remove(notification);
                await db.SaveChangesAsync();
                await DashboardCache.InvalidateAsync(cache);
            }
            return Results.Ok(new { success = true });
        });
        notifications.MapDelete("/", async (IUserContext user, AgricultureDbContext db, ICacheService cache) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            var items = await db.Notifications.Where(n => n.UserId == user.UserId.Value).ToListAsync();
            if (items.Count > 0)
            {
                db.Notifications.RemoveRange(items);
                await db.SaveChangesAsync();
                await DashboardCache.InvalidateAsync(cache);
            }
            return Results.Ok(new { success = true });
        });

        api.MapPost("/devices/push-token", async (
            RegisterPushTokenRequest body,
            IUserContext user,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(body.Token))
                return Results.BadRequest(new { Code = "Push.TokenRequired", Message = "Token gerekli." });

            var platform = body.Platform?.Trim().ToLowerInvariant();
            var token = body.Token.Trim();
            if (platform == "web-push" && !WebPushDelivery.TryNormalizeSubscription(token, out token))
                return Results.BadRequest(new { Code = "Push.InvalidSubscription", Message = "Web Push aboneliği geçersiz." });
            if (token.Length > 500)
                return Results.BadRequest(new { Code = "Push.TokenTooLong", Message = "Push tokenı çok uzun." });
            var existing = await db.DevicePushTokens
                .FirstOrDefaultAsync(t => t.Token == token && !t.IsDeleted);
            if (existing is null)
            {
                await db.DevicePushTokens.AddAsync(
                    DevicePushToken.Create(user.UserId.Value, token, platform));
            }
            else if (existing.UserId != user.UserId.Value)
            {
                db.DevicePushTokens.Remove(existing);
                await db.DevicePushTokens.AddAsync(
                    DevicePushToken.Create(user.UserId.Value, token, platform));
            }
            else
            {
                existing.Touch(platform);
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { registered = true });
        }).RequireAuthorization();

        api.MapPost("/devices/push-token/unregister", async (
            RegisterPushTokenRequest body,
            IUserContext user,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null) return Results.Unauthorized();
            var platform = body.Platform?.Trim().ToLowerInvariant();
            var token = body.Token.Trim();
            if (platform == "web-push" && !WebPushDelivery.TryNormalizeSubscription(token, out token))
                return Results.BadRequest(new { Code = "Push.InvalidSubscription", Message = "Web Push aboneliği geçersiz." });

            var existing = await db.DevicePushTokens.FirstOrDefaultAsync(
                item => item.UserId == user.UserId.Value && item.Token == token && !item.IsDeleted);
            if (existing is not null)
            {
                db.DevicePushTokens.Remove(existing);
                await db.SaveChangesAsync();
            }
            return Results.Ok(new { registered = false });
        }).RequireAuthorization();

        api.MapGet("/devices/web-push-key", (
            IConfiguration configuration,
            IWebHostEnvironment environment) =>
        {
            return WebPushDelivery.TryGetSettings(configuration, environment, out var settings)
                ? Results.Ok(new { publicKey = settings.PublicKey })
                : Results.Problem(
                    statusCode: StatusCodes.Status503ServiceUnavailable,
                    title: "Web Push yapılandırılmamış",
                    detail: "WebPush__PublicKey ve WebPush__PrivateKey ortam değerlerini tanımlayın.");
        }).RequireAuthorization();

        return api;
    }
}

internal sealed record RegisterPushTokenRequest(string Token, string? Platform);
