using Microsoft.AspNetCore.SignalR;
using Agriculture.Application.Abstractions.Authentication;
using System.Security.Claims;

namespace Agriculture.Api.Hubs;

public class NotificationHub : Hub
{
    private readonly IUserContext _userContext;

    public NotificationHub(IUserContext userContext)
    {
        _userContext = userContext;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = _userContext.UserId?.ToString();
        var producerId = Context.User?.FindFirst("ProducerId")?.Value;

        if (!string.IsNullOrEmpty(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"User_{userId}");
        }

        if (!string.IsNullOrEmpty(producerId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"Producer_{producerId}");
        }

        await base.OnConnectedAsync();
    }
}
