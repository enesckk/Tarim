using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Notifications.Application.Commands.MarkNotificationRead;
using Agriculture.Modules.Notifications.Application.Queries.GetNotifications;
using Agriculture.Modules.Notifications.Domain.Entities;
using MediatR;
using Agriculture.Application.Abstractions.Caching;
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

        api.MapPost("/devices/push-token", async (
            RegisterPushTokenRequest body,
            IUserContext user,
            AgricultureDbContext db) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(body.Token))
                return Results.BadRequest(new { Code = "Push.TokenRequired", Message = "Token gerekli." });

            var token = body.Token.Trim();
            if (token.Length > 2000)
                return Results.BadRequest(new { Code = "Push.TokenTooLong", Message = "Token çok uzun." });

            var existing = await db.DevicePushTokens
                .FirstOrDefaultAsync(t => t.Token == token && !t.IsDeleted);
            if (existing is null)
            {
                await db.DevicePushTokens.AddAsync(
                    DevicePushToken.Create(user.UserId.Value, token, body.Platform));
            }
            else if (existing.UserId != user.UserId.Value)
            {
                db.DevicePushTokens.Remove(existing);
                await db.DevicePushTokens.AddAsync(
                    DevicePushToken.Create(user.UserId.Value, token, body.Platform));
            }
            else
            {
                existing.Touch(body.Platform);
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { registered = true });
        }).RequireAuthorization();

        api.MapGet("/devices/web-push-public-key", (IConfiguration config) =>
        {
            var publicKey = config["WebPush:PublicKey"];
            if (string.IsNullOrWhiteSpace(publicKey))
                return Results.NotFound(new { Code = "WebPush.NotConfigured", Message = "Web Push yapılandırılmadı." });
            return Results.Ok(new { publicKey });
        });

        return api;
    }
}

internal sealed record RegisterPushTokenRequest(string Token, string? Platform);
