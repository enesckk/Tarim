namespace Agriculture.Modules.Identity.Domain.Permissions;

public static class AppPermissions
{
    public const string UsersManage = "users.manage";
    public const string RolesManage = "roles.manage";
    public const string ProducersManage = "producers.manage";
    public const string LandsManage = "lands.manage";
    public const string SeasonsManage = "seasons.manage";
    public const string WorkflowsManage = "workflows.manage";
    public const string TasksManage = "tasks.manage";
    public const string InspectionsManage = "inspections.manage";
    public const string InspectionsExecute = "inspections.execute";
    public const string HarvestManage = "harvest.manage";
    public const string SupportManage = "support.manage";
    public const string ReportsView = "reports.view";
    public const string DashboardView = "dashboard.view";
    public const string TasksComplete = "tasks.complete";

    public static readonly Dictionary<string, string[]> RolePermissions = new()
    {
        [Roles.AppRoles.Administrator] =
        [
            UsersManage, RolesManage, ProducersManage, LandsManage, SeasonsManage,
            WorkflowsManage, TasksManage, InspectionsManage, HarvestManage,
            SupportManage, ReportsView, DashboardView
        ],
        // SDS-R16: Officer = Tarım Uzmanı + Denetçi (combined) — includes inspections
        [Roles.AppRoles.Officer] =
        [
            ProducersManage, LandsManage, SeasonsManage, WorkflowsManage, TasksManage,
            InspectionsManage, InspectionsExecute, HarvestManage, SupportManage,
            ReportsView, DashboardView
        ],
        [Roles.AppRoles.Producer] = [TasksComplete, SupportManage],
        [Roles.AppRoles.Inspector] = [InspectionsExecute]
    };
}
