using Agriculture.Infrastructure.Persistence;
using Agriculture.Modules.Lands.Domain.Entities;
using Microsoft.EntityFrameworkCore;

internal static partial class DatabaseInitializer
{
    /// <summary>
    /// Restores the verified real cadastral parcels that belong to this workspace.
    /// The source geometries live under tarim_ai/fixtures/parcels/verified and the
    /// uploaded drone photographs live under frontend/public/drone_photos.
    ///
    /// This repair never deletes a land and never changes its producer/officer links.
    /// Existing records are matched by cadastral identity and repaired in place;
    /// only genuinely missing records are inserted.
    /// </summary>
    public static async Task SeedVerifiedParcelDataAsync(AgricultureDbContext db)
    {
        var lands = await db.Lands.ToListAsync();
        var matchedLandIds = new HashSet<Guid>();

        foreach (var def in GetVerifiedParcelDefinitions())
        {
            var existing = lands.FirstOrDefault(land =>
                !matchedLandIds.Contains(land.Id)
                && Same(land.Neighborhood, def.Neighborhood)
                && Same(land.CadastralBlock, def.CadastralBlock)
                && Same(land.ParcelNumber, def.ParcelNumber));

            // Older records did not always persist the block. Only reuse such a
            // record when neighborhood + parcel identifies one unambiguous land.
            if (existing is null)
            {
                var legacyCandidates = lands
                    .Where(land =>
                        !matchedLandIds.Contains(land.Id)
                        && Same(land.Neighborhood, def.Neighborhood)
                        && Same(land.ParcelNumber, def.ParcelNumber))
                    .ToList();

                if (legacyCandidates.Count == 1)
                    existing = legacyCandidates[0];
            }

            if (existing is null)
            {
                var land = Land.Create(
                    def.Name,
                    def.ParcelNumber,
                    def.SizeInDecares,
                    cadastralBlock: def.CadastralBlock,
                    latitude: def.Latitude,
                    longitude: def.Longitude,
                    soilType: def.SoilType,
                    soilNotes: "Doğrulanmış kadastro kaydı.",
                    city: "Gaziantep",
                    district: "Şehitkamil",
                    neighborhood: def.Neighborhood);
                SetEntityId(land, def.LandId);
                await db.Lands.AddAsync(land);
                lands.Add(land);
                matchedLandIds.Add(land.Id);
                continue;
            }

            existing.RepairRegistryData(
                def.Name,
                def.ParcelNumber,
                def.SizeInDecares,
                def.CadastralBlock,
                def.Neighborhood,
                def.Latitude,
                def.Longitude,
                def.SoilType,
                "Gaziantep",
                "Şehitkamil");
            matchedLandIds.Add(existing.Id);
        }

        await db.SaveChangesAsync();
    }

    private static bool Same(string? left, string right) =>
        string.Equals(left?.Trim(), right.Trim(), StringComparison.OrdinalIgnoreCase);

    private static IReadOnlyList<VerifiedParcelDef> GetVerifiedParcelDefinitions() =>
    [
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444401"),
            "Güngürge 108/7 Arazisi", "Güngürge", "108", "7", 21.91316m,
            37.2062788, 37.4750187, "Tarla"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444402"),
            "Güngürge 131/80 Arazisi", "Güngürge", "131", "80", 7.58998m,
            37.2155686, 37.4599571, "Tarla"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444403"),
            "Işıklı 151/1 Arazisi", "Işıklı", "151", "1", 11.62340m,
            37.1463116, 37.1948321, "Tarla"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444404"),
            "Işıklı 216/1 Arazisi", "Işıklı", "216", "1", 16.30233m,
            37.1228240, 37.2118513, "Tarla"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444405"),
            "Sinan 0/1513 Arazisi", "Sinan", "0", "1513", 311.20000m,
            37.0022119, 37.5827381, "Ham Toprak"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444406"),
            "Suboğazı 106/31 Arazisi", "Suboğazı", "106", "31", 4.94212m,
            37.1603017, 37.5080300, "Karışık Meyve Bahçesi"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444407"),
            "Suboğazı 106/51 Arazisi", "Suboğazı", "106", "51", 6.77111m,
            37.1584933, 37.4997833, "Tarla"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444408"),
            "Suboğazı 142/40 Arazisi", "Suboğazı", "142", "40", 15.38316m,
            37.0956821, 37.5861254, "Fıstıklık"),
        new(
            Guid.Parse("b4444444-4444-4444-4444-444444444409"),
            "Yalangoz 103/85 Arazisi", "Yalangoz", "103", "85", 87.60000m,
            37.2232567, 37.4238488, "Tarla")
    ];

    private sealed record VerifiedParcelDef(
        Guid LandId,
        string Name,
        string Neighborhood,
        string CadastralBlock,
        string ParcelNumber,
        decimal SizeInDecares,
        double Latitude,
        double Longitude,
        string SoilType);
}
