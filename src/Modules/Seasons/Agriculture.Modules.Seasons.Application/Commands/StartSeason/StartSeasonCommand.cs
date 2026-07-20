using Agriculture.Application.Abstractions.Data;
using Agriculture.Application.Abstractions.Messaging;
using Agriculture.Modules.Seasons.Application.Abstractions;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Seasons.Application.Commands.StartSeason;

public sealed record StartSeasonCommand(Guid SeasonId) : ICommand;

internal sealed class StartSeasonCommandHandler(ISeasonRepository repository, IUnitOfWork uow)
    : ICommandHandler<StartSeasonCommand>
{
    public async Task<Result> Handle(StartSeasonCommand request, CancellationToken cancellationToken)
    {
        var season = await repository.GetByIdAsync(request.SeasonId, cancellationToken);
        if (season is null)
            return Result.Failure(new Error("Season.NotFound", "Season was not found."));

        try
        {
            season.Start();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Failure(new Error("Season.InvalidState", ex.Message));
        }

        repository.Update(season);
        await uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
