using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Identity.Domain.Roles;
using Agriculture.Modules.Identity.Infrastructure.Identity;
using Agriculture.Modules.Notifications.Domain.Entities;
using Agriculture.Modules.Tasks.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Agriculture.Infrastructure.BackgroundJobs;

public class OverdueTaskJob
{
    private readonly IServiceProvider _serviceProvider;

    public OverdueTaskJob(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task ProcessOverdueTasksAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AgricultureDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Bulunacak görevler: Tamamlanmamış ve tarihi geçmiş olanlar
        var overdueTasks = await db.Tasks
            .Where(t => t.Status != ProductionTaskStatus.Completed
                     && t.Status != ProductionTaskStatus.Cancelled
                     && t.DueDate != null
                     && t.DueDate < today
                     && t.Status != ProductionTaskStatus.Overdue)
            .ToListAsync();

        foreach (var task in overdueTasks)
        {
            task.MarkOverdue();
        }

        if (overdueTasks.Any())
        {
            await db.SaveChangesAsync();
            
            // Yöneticilere bildirim oluştur
            var admins = await userManager.GetUsersInRoleAsync(AppRoles.Administrator);
            foreach (var task in overdueTasks)
            {
                var land = await db.Lands.FirstOrDefaultAsync(l => l.Id == task.LandId);
                var landName = land?.Name ?? "Arazi";
                
                foreach (var admin in admins)
                {
                    var title = "Görev Gecikti";
                    var body = $"{landName} için «{task.Title}» görevinin tarihi geçti!";
                    
                    var exists = await db.Notifications.AnyAsync(n => 
                        n.UserId == admin.Id && n.RelatedEntityId == task.Id && !n.IsRead);
                    
                    if (!exists)
                    {
                        var notification = Notification.Create(
                            admin.Id, title, body, NotificationChannel.InApp, "Task", task.Id);
                        await db.Notifications.AddAsync(notification);
                    }
                }
            }
            await db.SaveChangesAsync();
        }
    }
}
