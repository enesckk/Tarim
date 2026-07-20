using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Communication.Application.Abstractions;
using Agriculture.Modules.Communication.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Communication.Application.Commands.StartStaffConversation;

public sealed record StartStaffConversationCommand(
    Guid AdminUserId,
    Guid OfficerUserId,
    string? Subject) : ICommand<Guid>;

public sealed class StartStaffConversationCommandValidator : AbstractValidator<StartStaffConversationCommand>
{
    public StartStaffConversationCommandValidator()
    {
        RuleFor(x => x.AdminUserId).NotEmpty();
        RuleFor(x => x.OfficerUserId).NotEmpty();
        RuleFor(x => x.Subject).MaximumLength(200);
    }
}

internal sealed class StartStaffConversationCommandHandler(IConversationRepository repository, IUnitOfWork uow)
    : ICommandHandler<StartStaffConversationCommand, Guid>
{
    public async Task<Result<Guid>> Handle(StartStaffConversationCommand request, CancellationToken cancellationToken)
    {
        var existing = await repository.GetOpenStaffThreadAsync(
            request.AdminUserId, request.OfficerUserId, cancellationToken);
        if (existing is not null)
            return Result.Success(existing.Id);

        var conversation = Conversation.CreateStaff(
            request.AdminUserId,
            request.OfficerUserId,
            request.Subject ?? "Personel yazışması");
        await repository.AddAsync(conversation, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(conversation.Id);
    }
}
