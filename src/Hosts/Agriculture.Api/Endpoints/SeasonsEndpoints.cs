using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Seasons.Application.Commands.CreateSeason;
using Agriculture.Modules.Seasons.Application.Commands.StartSeason;
using Agriculture.Modules.Seasons.Application.Queries.GetSeasons;
using MediatR;
using Microsoft.Extensions.Caching.Memory;

internal static class SeasonsEndpoints
{
    public static RouteGroupBuilder MapSeasonsEndpoints(this RouteGroupBuilder api)
    {
        // Seasons
        var seasons = api.MapGroup("/seasons").WithTags("Seasons").RequireAuthorization();
        seasons.MapGet("/", async (ISender sender) => ApiResults.From(await sender.Send(new GetSeasonsQuery())));
        seasons.MapPost("/", async (CreateSeasonCommand command, ISender sender, IMemoryCache cache) =>
        {
            var result = await sender.Send(command);
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));
        seasons.MapPost("/{id:guid}/start", async (Guid id, ISender sender, IMemoryCache cache) =>
        {
            var result = await sender.Send(new StartSeasonCommand(id));
            if (result.IsSuccess)
                DashboardCache.Invalidate(cache);
            return ApiResults.From(result);
        }).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));

        return api;
    }
}
