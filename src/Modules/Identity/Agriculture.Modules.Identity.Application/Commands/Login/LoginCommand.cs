using Agriculture.Application.Abstractions.Messaging;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Identity.Application.Commands.Login;

public sealed record LoginCommand(string Email, string Password) : ICommand<LoginResponse>;

public sealed record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAtUtc,
    Guid UserId,
    string Email,
    string FullName,
    IReadOnlyList<string> Roles);

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        // Email or phone/username — producers may sign in with either (SDS mobile UX).
        RuleFor(x => x.Email).NotEmpty().MaximumLength(256);
        RuleFor(x => x.Password).NotEmpty();
    }
}
