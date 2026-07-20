using Agriculture.Modules.Identity.Application.Abstractions;
using Agriculture.Modules.Identity.Application.Commands.Login;
using Agriculture.SharedKernel.Results;
using Agriculture.Application.Abstractions.Messaging;

namespace Agriculture.Modules.Identity.Application.Commands.Login;

internal sealed class LoginCommandHandler(IIdentityService identityService)
    : ICommandHandler<LoginCommand, LoginResponse>
{
    public async Task<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var (success, error, response) = await identityService.LoginAsync(
            request.Email, request.Password, cancellationToken);

        if (!success || response is null)
            return Result.Failure<LoginResponse>(new Error("Auth.InvalidCredentials", error ?? "Invalid credentials."));

        return Result.Success(response);
    }
}
