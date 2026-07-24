using Agriculture.Modules.Identity.Application.Commands.Login;

namespace Agriculture.Modules.Identity.Application.Abstractions;

public interface IIdentityService
{
    Task<(bool Success, string? Error, LoginResponse? Response)> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string? Error, Guid UserId)> RegisterAsync(
        string email,
        string password,
        string firstName,
        string lastName,
        string role,
        string? phone = null,
        CancellationToken cancellationToken = default);

    Task<(bool Success, string? Error, LoginResponse? Response)> RefreshTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);
}
