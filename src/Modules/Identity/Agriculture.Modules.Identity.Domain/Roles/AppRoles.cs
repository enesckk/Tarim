namespace Agriculture.Modules.Identity.Domain.Roles;

public static class AppRoles
{
    public const string Administrator = "Administrator";
    /// <summary>Tarım Uzmanı — Turkish UI label for this role key (SDS-R12).</summary>
    public const string Officer = "Officer";
    public const string Producer = "Producer";
    public const string Inspector = "Inspector";

    public static readonly string[] All = [Administrator, Officer, Producer, Inspector];
}
