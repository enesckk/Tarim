using Agriculture.Application.Abstractions.Messaging;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Identity.Application.Commands.RegisterUser;

public sealed record RegisterUserCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string Role,
    string? Phone = null,
    string? Specialization = null,
    string? Neighborhood = null,
    bool IsActive = true) : ICommand<Guid>;

public sealed class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-posta zorunludur.")
            .EmailAddress().WithMessage("Geçerli bir e-posta girin.");
        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Uygulama şifresi zorunludur.")
            .MinimumLength(8).WithMessage("Uygulama şifresi en az 8 karakter olmalıdır.");
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("Ad zorunludur.");
        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Soyad zorunludur.");
        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Rol zorunludur.");
        RuleFor(x => x.Specialization)
            .MaximumLength(200).WithMessage("Uzmanlık en fazla 200 karakter olabilir.");
        RuleFor(x => x.Neighborhood)
            .MaximumLength(200).WithMessage("Mahalle en fazla 200 karakter olabilir.");
    }
}
