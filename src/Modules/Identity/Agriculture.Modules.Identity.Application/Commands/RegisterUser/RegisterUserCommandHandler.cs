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
            phone: request.Phone,
            specialization: request.Specialization,
            neighborhood: request.Neighborhood,
            isActive: request.IsActive,
            cancellationToken);

        if (!success)
            return Result.Failure<Guid>(new Error("Auth.RegistrationFailed", error ?? "Kayıt başarısız."));

        return Result.Success(userId);
    }
}
