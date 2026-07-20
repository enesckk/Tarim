using Agriculture.Modules.Identity.Application.Abstractions;
using Agriculture.Modules.Identity.Application.Commands.Login;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Identity.Infrastructure.Options;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Agriculture.Modules.Identity.Infrastructure.Services;

public sealed class IdentityService(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions) : IIdentityService
{
    public async Task<(bool Success, string? Error, LoginResponse? Response)> LoginAsync(
        string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await userManager.FindByEmailAsync(email)
            ?? await userManager.FindByNameAsync(email)
            ?? await userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == email, cancellationToken);
        if (user is null || !user.IsActive)
            return (false, "Invalid email or password.", null);

        if (!await userManager.CheckPasswordAsync(user, password))
            return (false, "Invalid email or password.", null);

        var response = await BuildLoginResponseAsync(user);
        return (true, null, response);
    }

    public async Task<(bool Success, string? Error, Guid UserId)> RegisterAsync(
        string email, string password, string firstName, string lastName, string role,
        CancellationToken cancellationToken = default)
    {
        if (!AppRoles.All.Contains(role))
            return (false, $"Role must be one of: {string.Join(", ", AppRoles.All)}", Guid.Empty);

        if (await userManager.FindByEmailAsync(email) is not null)
            return (false, "Email is already registered.", Guid.Empty);

        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = firstName.Trim(),
            LastName = lastName.Trim()
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
            return (false, string.Join("; ", result.Errors.Select(e => e.Description)), Guid.Empty);

        await userManager.AddToRoleAsync(user, role);
        return (true, null, user.Id);
    }

    public async Task<(bool Success, string? Error, LoginResponse? Response)> RefreshTokenAsync(
        string refreshToken, CancellationToken cancellationToken = default)
    {
        var user = await userManager.Users.FirstOrDefaultAsync(
            u => u.RefreshToken == refreshToken, cancellationToken);

        if (user is null || user.RefreshTokenExpiresAtUtc is null ||
            user.RefreshTokenExpiresAtUtc < DateTime.UtcNow || !user.IsActive)
            return (false, "Invalid or expired refresh token.", null);

        var response = await BuildLoginResponseAsync(user);
        return (true, null, response);
    }

    private async Task<LoginResponse> BuildLoginResponseAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        var (accessToken, expires) = jwtTokenService.CreateAccessToken(user, roles);
        var refreshToken = jwtTokenService.CreateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAtUtc = DateTime.UtcNow.AddDays(jwtOptions.Value.RefreshTokenExpirationDays);
        await userManager.UpdateAsync(user);

        return new LoginResponse(
            accessToken,
            refreshToken,
            expires,
            user.Id,
            user.Email ?? string.Empty,
            $"{user.FirstName} {user.LastName}",
            roles.ToList());
    }
}
