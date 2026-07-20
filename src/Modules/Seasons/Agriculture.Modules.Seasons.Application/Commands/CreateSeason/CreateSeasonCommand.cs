using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Seasons.Application.Abstractions;
using Agriculture.Modules.Seasons.Domain.Entities;
using Agriculture.SharedKernel.Results;
using FluentValidation;

namespace Agriculture.Modules.Seasons.Application.Commands.CreateSeason;

public sealed record CreateSeasonCommand(string Name, int Year, DateOnly StartDate, string? Description) : ICommand<Guid>;

public sealed class CreateSeasonCommandValidator : AbstractValidator<CreateSeasonCommand>
{
    public CreateSeasonCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Year).InclusiveBetween(2000, 2100);
    }
}

internal sealed class CreateSeasonCommandHandler(ISeasonRepository repository, IUnitOfWork uow)
    : ICommandHandler<CreateSeasonCommand, Guid>
{
    public async Task<Result<Guid>> Handle(CreateSeasonCommand request, CancellationToken cancellationToken)
    {
        var season = Season.Create(request.Name, request.Year, request.StartDate, request.Description);
        await repository.AddAsync(season, cancellationToken);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success(season.Id);
    }
}
