namespace Agriculture.Modules.Identity.Infrastructure.Options;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";
    public string Issuer { get; set; } = "Agriculture";
    public string Audience { get; set; } = "Agriculture";
    public string Secret { get; set; } = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET_KEY_32+";
    public int AccessTokenExpirationMinutes { get; set; } = 60;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
