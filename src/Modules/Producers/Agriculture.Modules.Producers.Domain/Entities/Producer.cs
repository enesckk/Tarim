using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Producers.Domain.Entities;

public sealed class Producer : AuditableEntity
{
    private Producer() { }

    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string NationalId { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string? Address { get; private set; }
    public Guid? UserId { get; private set; }
    public bool IsActive { get; private set; } = true;

    public string FullName => $"{FirstName} {LastName}";

    public static Producer Create(
        string firstName,
        string lastName,
        string nationalId,
        string phone,
        string? email = null,
        string? address = null,
        Guid? userId = null)
    {
        return new Producer
        {
            FirstName = firstName.Trim(),
            LastName = lastName.Trim(),
            NationalId = nationalId.Trim(),
            Phone = phone.Trim(),
            Email = email?.Trim(),
            Address = address?.Trim(),
            UserId = userId
        };
    }

    public void Update(string firstName, string lastName, string phone, string? email, string? address)
    {
        FirstName = firstName.Trim();
        LastName = lastName.Trim();
        Phone = phone.Trim();
        Email = email?.Trim();
        Address = address?.Trim();
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void AssignUser(Guid userId)
    {
        UserId = userId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
