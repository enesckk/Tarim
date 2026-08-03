using Agriculture.Application.Abstractions.Authentication;
using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Application.Commands.Login;
using Agriculture.Modules.Identity.Application.Commands.RefreshToken;
using Agriculture.Modules.Identity.Application.Commands.RegisterUser;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Producers.Domain.Entities;
using MediatR;
using Agriculture.Application.Abstractions.Caching;
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

        // Staff directory — admin Uzmanlar page (enriched aggregates)
        api.MapGet("/staff/officers", async (
            UserManager<ApplicationUser> userManager,
            AgricultureDbContext db) =>
        {
            var officers = await userManager.GetUsersInRoleAsync(AppRoles.Officer);
            return Results.Ok(await BuildOfficerDtosAsync(officers, db));
        }).WithTags("Staff").RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));

        api.MapGet("/staff/officers/{id:guid}", async (
            Guid id,
            UserManager<ApplicationUser> userManager,
            AgricultureDbContext db) =>
        {
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user is null || !await userManager.IsInRoleAsync(user, AppRoles.Officer))
                return Results.NotFound();

            var list = await BuildOfficerDtosAsync([user], db);
            return Results.Ok(list[0]);
        }).WithTags("Staff").RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));

        api.MapPut("/staff/officers/{id:guid}", async (
            Guid id,
            UpdateOfficerRequest body,
            UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.FindByIdAsync(id.ToString());
            if (user is null || !await userManager.IsInRoleAsync(user, AppRoles.Officer))
                return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(body.FirstName))
                user.FirstName = body.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(body.LastName))
                user.LastName = body.LastName.Trim();
            if (body.PhoneNumber is not null)
                user.PhoneNumber = string.IsNullOrWhiteSpace(body.PhoneNumber) ? null : body.PhoneNumber.Trim();
            if (body.Specialization is not null)
                user.Specialization = string.IsNullOrWhiteSpace(body.Specialization) ? null : body.Specialization.Trim();
            if (body.Neighborhood is not null)
                user.Neighborhood = string.IsNullOrWhiteSpace(body.Neighborhood) ? null : body.Neighborhood.Trim();
            if (body.IsActive.HasValue)
                user.IsActive = body.IsActive.Value;

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
                return Results.BadRequest(new { error = string.Join("; ", result.Errors.Select(e => e.Description)) });

            return Results.Ok(new
            {
                user.Id,
                user.Email,
                FullName = $"{user.FirstName} {user.LastName}".Trim(),
                PhoneNumber = user.PhoneNumber,
                user.Specialization,
                user.Neighborhood,
                user.IsActive,
                Status = user.IsActive ? "Active" : "Passive"
            });
        }).WithTags("Staff").RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));

        // Staff directory (officers for land assignment) — same payload shape
        api.MapGet("/users/officers", async (
            UserManager<ApplicationUser> userManager,
            AgricultureDbContext db) =>
        {
            var officers = await userManager.GetUsersInRoleAsync(AppRoles.Officer);
            return Results.Ok(await BuildOfficerDtosAsync(officers, db));
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

    private static async Task<IReadOnlyList<object>> BuildOfficerDtosAsync(
        IList<ApplicationUser> officers,
        AgricultureDbContext db)
    {
        if (officers.Count == 0)
            return [];

        var officerIds = officers.Select(o => o.Id).ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var landCounts = await db.Lands.AsNoTracking()
            .Where(l => l.AssignedOfficerUserId != null && officerIds.Contains(l.AssignedOfficerUserId.Value))
            .GroupBy(l => l.AssignedOfficerUserId!.Value)
            .Select(g => new { OfficerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OfficerId, x => x.Count);

        var inspectionCounts = await db.Inspections.AsNoTracking()
            .Where(i => officerIds.Contains(i.InspectorUserId) && i.ScheduledDate == today)
            .GroupBy(i => i.InspectorUserId)
            .Select(g => new { OfficerId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.OfficerId, x => x.Count);

        return officers
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Select(u => (object)new
            {
                u.Id,
                u.Email,
                FullName = $"{u.FirstName} {u.LastName}".Trim(),
                PhoneNumber = u.PhoneNumber,
                u.Specialization,
                u.Neighborhood,
                u.IsActive,
                Status = u.IsActive ? "Active" : "Passive",
                ResponsibleLandCount = landCounts.GetValueOrDefault(u.Id),
                TodaysInspectionCount = inspectionCounts.GetValueOrDefault(u.Id)
            })
            .ToList();
    }

    private sealed record UpdateOfficerRequest(
        string? FirstName,
        string? LastName,
        string? PhoneNumber,
        string? Specialization,
        string? Neighborhood,
        bool? IsActive);
}
