using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Application.Commands.Login;
using Agriculture.Modules.Identity.Application.Commands.RefreshToken;
using Agriculture.Modules.Identity.Application.Commands.RegisterUser;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Producers.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

internal static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        // Auth
        var auth = api.MapGroup("/auth").WithTags("Auth");
        auth.MapPost("/login", async (LoginCommand command, ISender sender) =>
            ApiResults.From(await sender.Send(command)));
        auth.MapPost("/register", async (RegisterUserCommand command, ISender sender) =>
            ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        auth.MapPost("/refresh", async (RefreshTokenCommand command, ISender sender) =>
            ApiResults.From(await sender.Send(command)));

        // Me (producer profile + staff identity)
        api.MapGet("/me", async (
            IUserContext user,
            AgricultureDbContext db,
            UserManager<ApplicationUser> userManager) =>
        {
            if (user.UserId is null)
                return Results.Unauthorized();

            var producer = await db.Producers.AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == user.UserId);

            string? fullName = producer?.FullName;
            string? phone = producer?.Phone;
            string? email = user.Email;

            if (producer is null)
            {
                var appUser = await userManager.FindByIdAsync(user.UserId.Value.ToString());
                if (appUser is not null)
                {
                    fullName = $"{appUser.FirstName} {appUser.LastName}".Trim();
                    if (string.IsNullOrWhiteSpace(fullName))
                        fullName = appUser.UserName;
                    phone = appUser.PhoneNumber;
                    email ??= appUser.Email;
                }
            }

            return Results.Ok(new
            {
                user.UserId,
                Email = email,
                Roles = user.Roles,
                ProducerId = producer?.Id,
                FullName = fullName,
                Phone = phone
            });
        }).WithTags("Identity").RequireAuthorization();
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

        return api;
    }
}
