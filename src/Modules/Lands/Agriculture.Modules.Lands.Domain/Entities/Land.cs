using Agriculture.SharedKernel.Primitives;

namespace Agriculture.Modules.Lands.Domain.Entities;

public sealed class Land : AuditableEntity
{
    private Land() { }

    public string Name { get; private set; } = string.Empty;
    public string ParcelNumber { get; private set; } = string.Empty;
    public string? CadastralBlock { get; private set; }
    public decimal SizeInDecares { get; private set; }
    public double? Latitude { get; private set; }
    public double? Longitude { get; private set; }
    public string? SoilType { get; private set; }
    public string? SoilNotes { get; private set; }
    public string? City { get; private set; }
    public string? District { get; private set; }
    public string? Neighborhood { get; private set; }
    public Guid? ProducerId { get; private set; }
    /// <summary>Assigned Tarım Uzmanı (Officer user id). SDS-R16.</summary>
    public Guid? AssignedOfficerUserId { get; private set; }
    public bool IsActive { get; private set; } = true;

    public static Land Create(
        string name,
        string parcelNumber,
        decimal sizeInDecares,
        string? cadastralBlock = null,
        double? latitude = null,
        double? longitude = null,
        string? soilType = null,
        string? soilNotes = null,
        string? city = null,
        string? district = null,
        string? neighborhood = null)
    {
        return new Land
        {
            Name = name.Trim(),
            ParcelNumber = parcelNumber.Trim(),
            SizeInDecares = sizeInDecares,
            CadastralBlock = cadastralBlock,
            Latitude = latitude,
            Longitude = longitude,
            SoilType = soilType,
            SoilNotes = soilNotes,
            City = city,
            District = district,
            Neighborhood = neighborhood
        };
    }

    public void AssignProducer(Guid producerId)
    {
        ProducerId = producerId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void AssignOfficer(Guid officerUserId)
    {
        AssignedOfficerUserId = officerUserId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void UpdateAssignments(Guid? producerId, Guid? officerUserId)
    {
        if (producerId.HasValue)
            ProducerId = producerId;
        if (officerUserId.HasValue)
            AssignedOfficerUserId = officerUserId;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void Update(
        string name,
        string parcelNumber,
        decimal sizeInDecares,
        string? cadastralBlock,
        string? neighborhood,
        double? latitude,
        double? longitude,
        string? soilType,
        string? soilNotes)
    {
        Name = name.Trim();
        ParcelNumber = parcelNumber.Trim();
        SizeInDecares = sizeInDecares;
        CadastralBlock = cadastralBlock;
        Neighborhood = neighborhood;
        Latitude = latitude;
        Longitude = longitude;
        SoilType = soilType;
        SoilNotes = soilNotes;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
