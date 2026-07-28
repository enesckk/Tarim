namespace Agriculture.Modules.Tasks.Domain.Entities;

/// <summary>İşlem teması kodları — görev oluştururken seçilir, tamamlarken kanıt kurallarını belirler.</summary>
public static class TaskThemes
{
    public const string Sulama = "Sulama";
    public const string Gubreleme = "Gubreleme";
    public const string Ilaclama = "Ilaclama";
    public const string Dikim = "Dikim";
    public const string Hasat = "Hasat";
    public const string Bakim = "Bakim";

    public static readonly IReadOnlyList<string> All =
    [
        Sulama,
        Gubreleme,
        Ilaclama,
        Dikim,
        Hasat,
        Bakim
    ];

    public static bool TryNormalize(string? raw, out string theme)
    {
        theme = string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
            return false;

        var t = raw.Trim();
        var normalized = t switch
        {
            "Sulama" or "sulama" => Sulama,
            "Gubreleme" or "Gübreleme" or "gübreleme" or "gubreleme" => Gubreleme,
            "Ilaclama" or "İlaçlama" or "ilaçlama" or "ilaclama" => Ilaclama,
            "Dikim" or "dikim" => Dikim,
            "Hasat" or "hasat" => Hasat,
            "Bakim" or "Bakım" or "bakım" or "bakim" => Bakim,
            _ => null
        };

        if (normalized is null)
            return false;

        theme = normalized;
        return true;
    }

    public static string DisplayName(string theme) => theme switch
    {
        Gubreleme => "Gübreleme",
        Ilaclama => "İlaçlama",
        Bakim => "Bakım",
        _ => theme
    };

    /// <summary>Tema yoksa 0 (eski RequiresPhoto kuralı kullanılır); Bakım 2; diğer temalar 1.</summary>
    public static int MinPhotoCount(string? theme) => theme switch
    {
        null or "" => 0,
        Bakim => 2,
        _ => 1
    };

    public static string EvidenceHint(string theme) => theme switch
    {
        Sulama => "Fotoğraf, süre, kullanılan su miktarı",
        Gubreleme => "Gübre adı, miktar, fotoğraf",
        Ilaclama => "İlaç adı, doz, su miktarı, fotoğraf",
        Dikim => "Fide sayısı, fotoğraf, başlangıç–bitiş zamanı",
        Hasat => "Ürün miktarı, kasa sayısı, fotoğraf",
        Bakim => "Öncesi–sonrası fotoğrafı, açıklama",
        _ => "Fotoğraf ve açıklama"
    };

    /// <summary>Tema seçildiğinde oluşturma varsayılanları.</summary>
    public static void ApplyCreateDefaults(string theme, out bool requiresPhoto)
    {
        _ = theme;
        requiresPhoto = true;
    }
}
