using Microsoft.AspNetCore.Identity;

namespace Agriculture.Modules.Identity.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAtUtc { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Officer specialization title, e.g. Bitki Koruma Uzmanı.</summary>
    public string? Specialization { get; set; }
    /// <summary>Primary neighborhood (Şehitkamil), e.g. Değirmiçem.</summary>
    public string? Neighborhood { get; set; }
}
