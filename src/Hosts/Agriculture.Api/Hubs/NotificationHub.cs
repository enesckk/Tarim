using Microsoft.AspNetCore.SignalR;
using Agriculture.Application.Abstractions.Security;
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
        var producerId = _userContext.ProducerId?.ToString();

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
