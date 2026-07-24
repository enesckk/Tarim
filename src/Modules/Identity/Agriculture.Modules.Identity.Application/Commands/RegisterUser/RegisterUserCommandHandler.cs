using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Identity.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Identity.Application.Commands.RegisterUser;

internal sealed class RegisterUserCommandHandler(IIdentityService identityService)
    : ICommandHandler<RegisterUserCommand, Guid>
{
    public async Task<Result<Guid>> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var (success, error, userId) = await identityService.RegisterAsync(
            request.Email,
            request.Password,
            request.FirstName,
            request.LastName,
            request.Role,
            phone: null,
            cancellationToken);

        if (!success)
            return Result.Failure<Guid>(new Error("Auth.RegistrationFailed", error ?? "Registration failed."));

        return Result.Success(userId);
    }
}
