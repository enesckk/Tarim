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
        var login = email.Trim();
        var user = await userManager.FindByEmailAsync(login)
            ?? await userManager.FindByNameAsync(login)
            ?? await FindByPhoneAsync(login, cancellationToken);
        if (user is null || !user.IsActive)
            return (false, "Invalid email or password.", null);

        if (!await userManager.CheckPasswordAsync(user, password))
            return (false, "Invalid email or password.", null);

        var response = await BuildLoginResponseAsync(user);
        return (true, null, response);
    }

    private async Task<ApplicationUser?> FindByPhoneAsync(string login, CancellationToken cancellationToken)
    {
        var exact = await userManager.Users.FirstOrDefaultAsync(
            u => u.PhoneNumber == login, cancellationToken);
        if (exact is not null)
            return exact;

        var want = NormalizePhoneDigits(login);
        if (want is null)
            return null;

        var candidates = await userManager.Users
            .Where(u => u.PhoneNumber != null)
            .ToListAsync(cancellationToken);
        return candidates.FirstOrDefault(u => NormalizePhoneDigits(u.PhoneNumber) == want);
    }

    private static string? NormalizePhoneDigits(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        var digits = new string(value.Where(char.IsDigit).ToArray());
        if (digits.Length >= 10)
            return digits[^10..];
        return digits.Length > 0 ? digits : null;
    }

    public async Task<(bool Success, string? Error, Guid UserId)> RegisterAsync(
        string email, string password, string firstName, string lastName, string role,
        string? phone = null,
        CancellationToken cancellationToken = default)
    {
        if (!AppRoles.All.Contains(role))
            return (false, $"Role must be one of: {string.Join(", ", AppRoles.All)}", Guid.Empty);

        var firstNameTrim = firstName?.Trim() ?? string.Empty;
        var lastNameTrim = lastName?.Trim() ?? string.Empty;
        var passwordTrim = password?.Trim() ?? string.Empty;
        var normalizedEmail = email?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(firstNameTrim))
            return (false, "Ad zorunludur.", Guid.Empty);
        if (string.IsNullOrWhiteSpace(lastNameTrim))
            return (false, "Soyad zorunludur.", Guid.Empty);
        if (string.IsNullOrWhiteSpace(passwordTrim))
            return (false, "Şifre zorunludur.", Guid.Empty);
        if (string.IsNullOrWhiteSpace(normalizedEmail))
            return (false, "E-posta zorunludur.", Guid.Empty);

        if (await userManager.FindByEmailAsync(normalizedEmail) is not null)
            return (false, "Bu e-posta zaten kayıtlı.", Guid.Empty);

        var phoneTrim = phone?.Trim();
        if (!string.IsNullOrWhiteSpace(phoneTrim))
        {
            var want = NormalizePhoneDigits(phoneTrim);
            if (want is not null)
            {
                var phoneTaken = await userManager.Users
                    .Where(u => u.PhoneNumber != null)
                    .ToListAsync(cancellationToken);
                if (phoneTaken.Any(u => NormalizePhoneDigits(u.PhoneNumber) == want))
                    return (false, "Bu telefon numarası zaten kayıtlı.", Guid.Empty);
            }
        }

        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));

        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = normalizedEmail,
            Email = normalizedEmail,
            EmailConfirmed = true,
            FirstName = firstNameTrim,
            LastName = lastNameTrim,
            PhoneNumber = string.IsNullOrWhiteSpace(phoneTrim) ? null : phoneTrim,
            IsActive = true
        };

        var result = await userManager.CreateAsync(user, passwordTrim);
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
