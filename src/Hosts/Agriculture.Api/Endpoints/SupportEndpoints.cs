using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Support.Application.Commands.CreateSupportProgram;
using Agriculture.Modules.Support.Application.Queries.GetSupportPrograms;
using MediatR;
using Agriculture.Application.Abstractions.Caching;

internal static class SupportEndpoints
{
    public static RouteGroupBuilder MapSupportEndpoints(this RouteGroupBuilder api)
    {
        // Support
        var support = api.MapGroup("/support").WithTags("Support").RequireAuthorization();
        support.MapGet("/programs", async (ISender sender) => ApiResults.From(await sender.Send(new GetSupportProgramsQuery())));
        support.MapPost("/programs", async (CreateSupportProgramCommand command, ISender sender) =>
            ApiResults.From(await sender.Send(command))).RequireAuthorization(policy => policy.RequireRole(AppRoles.Administrator));

        return api;
    }
}
