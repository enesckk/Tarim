using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Identity.Application.Abstractions;
using Agriculture.Modules.Identity.Application.Commands.Login;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Identity.Application.Commands.RefreshToken;

public sealed record RefreshTokenCommand(string RefreshToken) : ICommand<LoginResponse>;

public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}

internal sealed class RefreshTokenCommandHandler(IIdentityService identityService)
    : ICommandHandler<RefreshTokenCommand, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var (success, error, response) = await identityService.RefreshTokenAsync(request.RefreshToken, cancellationToken);
        if (!success || response is null)
            return Result.Failure<LoginResponse>(new Error("Auth.InvalidRefreshToken", error ?? "Invalid refresh token."));

        return Result.Success(response);
    }
}
