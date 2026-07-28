using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using Agriculture.Modules.Tasks.Domain.Entities;
using Agriculture.SharedKernel.Results;

namespace Agriculture.Modules.Tasks.Application;

/// <summary>Tema bazlı yapılandırılmış kanıt alanları (complete isteği / EvidenceJson).</summary>
public sealed class TaskEvidenceDto
{
    public int? DurationMinutes { get; set; }
    public decimal? WaterAmount { get; set; }
    public string? WaterUnit { get; set; }
    public string? FertilizerName { get; set; }
    public decimal? Amount { get; set; }
    public string? AmountUnit { get; set; }
    public string? PesticideName { get; set; }
    public string? Dose { get; set; }
    public int? SeedlingCount { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public decimal? ProductQuantity { get; set; }
    public string? ProductUnit { get; set; }
    public int? CrateCount { get; set; }
    public string? Description { get; set; }
}

public static class TaskEvidenceHelper
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    public static Result Validate(string? theme, TaskEvidenceDto? evidence)
    {
        if (string.IsNullOrWhiteSpace(theme))
            return Result.Success();

        if (!TaskThemes.TryNormalize(theme, out var normalized))
            return Result.Failure(new Error("Task.InvalidTheme", "Geçersiz işlem teması."));

        evidence ??= new TaskEvidenceDto();

        return normalized switch
        {
            TaskThemes.Sulama => ValidateSulama(evidence),
            TaskThemes.Gubreleme => ValidateGubreleme(evidence),
            TaskThemes.Ilaclama => ValidateIlaclama(evidence),
            TaskThemes.Dikim => ValidateDikim(evidence),
            TaskThemes.Hasat => ValidateHasat(evidence),
            TaskThemes.Bakim => ValidateBakim(evidence),
            _ => Result.Success()
        };
    }

    /// <summary>
    /// Uzman oluştururken planlanan/hedef alanlar. Fotoğraf yok; Dikim için yalnızca fide sayısı zorunlu
    /// (başlangıç–bitiş üreticinin gerçekleşen kanıtında).
    /// </summary>
    public static Result ValidatePlanned(string? theme, TaskEvidenceDto? evidence)
    {
        if (string.IsNullOrWhiteSpace(theme))
            return Result.Success();

        if (!TaskThemes.TryNormalize(theme, out var normalized))
            return Result.Failure(new Error("Task.InvalidTheme", "Geçersiz işlem teması."));

        evidence ??= new TaskEvidenceDto();

        return normalized switch
        {
            TaskThemes.Sulama => ValidateSulama(evidence, planned: true),
            TaskThemes.Gubreleme => ValidateGubreleme(evidence, planned: true),
            TaskThemes.Ilaclama => ValidateIlaclama(evidence, planned: true),
            TaskThemes.Dikim => ValidateDikimPlanned(evidence),
            TaskThemes.Hasat => ValidateHasat(evidence, planned: true),
            TaskThemes.Bakim => ValidateBakim(evidence, planned: true),
            _ => Result.Success()
        };
    }

    public static string ToJson(TaskEvidenceDto evidence) =>
        JsonSerializer.Serialize(evidence, JsonOptions);

    public static TaskEvidenceDto? FromJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;
        try
        {
            return JsonSerializer.Deserialize<TaskEvidenceDto>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Soft warning only: planned vs actual numeric fields differ by more than ~15%,
    /// or a planned numeric value has no comparable actual. Never auto-rejects.
    /// </summary>
    public static (bool HasWarning, string? Message) EvaluateVariance(
        string? plannedJson,
        string? actualJson)
    {
        var planned = FromJson(plannedJson);
        var actual = FromJson(actualJson);
        if (planned is null)
            return (false, null);

        var issues = new List<string>();
        CompareNumeric("Süre (dk)", planned.DurationMinutes, actual?.DurationMinutes, issues);
        CompareNumeric("Su miktarı", planned.WaterAmount, actual?.WaterAmount, issues);
        CompareNumeric("Miktar", planned.Amount, actual?.Amount, issues);
        CompareNumeric("Fide sayısı", planned.SeedlingCount, actual?.SeedlingCount, issues);
        CompareNumeric("Ürün miktarı", planned.ProductQuantity, actual?.ProductQuantity, issues);
        CompareNumeric("Kasa sayısı", planned.CrateCount, actual?.CrateCount, issues);

        if (issues.Count == 0)
            return (false, null);

        return (true, string.Join("; ", issues));
    }

    private const decimal VarianceRatio = 0.15m;

    private static void CompareNumeric(string label, int? planned, int? actual, List<string> issues)
    {
        decimal? plannedDec = planned is null ? null : (decimal)planned.Value;
        decimal? actualDec = actual is null ? null : (decimal)actual.Value;
        CompareDecimal(label, plannedDec, actualDec, issues);
    }

    private static void CompareNumeric(string label, decimal? planned, decimal? actual, List<string> issues)
        => CompareDecimal(label, planned, actual, issues);

    private static void CompareDecimal(string label, decimal? planned, decimal? actual, List<string> issues)
    {
        if (planned is null)
            return;

        if (actual is null)
        {
            issues.Add($"{label}: planlanan değer var, gerçekleşen yok");
            return;
        }

        var p = Math.Abs(planned.Value);
        if (p == 0)
        {
            if (actual.Value != 0)
                issues.Add($"{label}: plan 0, gerçekleşen {FormatDec(actual.Value)}");
            return;
        }

        var ratio = Math.Abs(actual.Value - planned.Value) / p;
        if (ratio > VarianceRatio)
        {
            var pct = Math.Round(ratio * 100m, 0);
            issues.Add($"{label}: %{pct} sapma (plan {FormatDec(planned.Value)} → {FormatDec(actual.Value)})");
        }
    }

    /// <summary>Onay kartlarında okunabilir özet + isteğe bağlı üretici notu.</summary>
    public static string FormatCompletionNotes(string? theme, TaskEvidenceDto? evidence, string? extraNotes)
    {
        var lines = new List<string>();

        if (!string.IsNullOrWhiteSpace(theme) && TaskThemes.TryNormalize(theme, out var t))
            lines.Add($"Tema: {TaskThemes.DisplayName(t)}");

        if (evidence is not null)
        {
            foreach (var line in FormatEvidenceLines(theme, evidence))
                lines.Add(line);
        }

        if (!string.IsNullOrWhiteSpace(extraNotes))
        {
            foreach (var line in extraNotes.Replace("\r\n", "\n").Split('\n'))
            {
                var trimmed = line.Trim();
                if (trimmed.Length == 0)
                    continue;
                // Avoid duplicating theme/evidence lines already formatted above
                if (lines.Exists(l => string.Equals(l, trimmed, StringComparison.Ordinal)))
                    continue;
                lines.Add(trimmed);
            }
        }

        return string.Join('\n', lines);
    }

    public static IReadOnlyList<string> FormatEvidenceLines(string? theme, TaskEvidenceDto e)
    {
        var lines = new List<string>();
        var t = theme;
        if (!string.IsNullOrWhiteSpace(theme))
            TaskThemes.TryNormalize(theme, out t!);

        switch (t)
        {
            case TaskThemes.Sulama:
                if (e.DurationMinutes is int dm)
                    lines.Add($"Süre: {dm} dk");
                if (e.WaterAmount is decimal wa)
                    lines.Add($"Su: {FormatDec(wa)}{UnitSuffix(e.WaterUnit ?? "litre")}");
                break;
            case TaskThemes.Gubreleme:
                if (!string.IsNullOrWhiteSpace(e.FertilizerName))
                    lines.Add($"Gübre: {e.FertilizerName.Trim()}");
                if (e.Amount is decimal amt)
                    lines.Add($"Miktar: {FormatDec(amt)}{UnitSuffix(e.AmountUnit)}");
                break;
            case TaskThemes.Ilaclama:
                if (!string.IsNullOrWhiteSpace(e.PesticideName))
                    lines.Add($"İlaç: {e.PesticideName.Trim()}");
                if (!string.IsNullOrWhiteSpace(e.Dose))
                    lines.Add($"Doz: {e.Dose.Trim()}");
                if (e.WaterAmount is decimal iw)
                    lines.Add($"Su: {FormatDec(iw)}{UnitSuffix(e.WaterUnit ?? "litre")}");
                break;
            case TaskThemes.Dikim:
                if (e.SeedlingCount is int sc)
                    lines.Add($"Fide sayısı: {sc}");
                if (e.StartedAt is DateTime sa)
                    lines.Add($"Başlangıç: {sa.ToLocalTime():g}");
                if (e.EndedAt is DateTime ea)
                    lines.Add($"Bitiş: {ea.ToLocalTime():g}");
                break;
            case TaskThemes.Hasat:
                if (e.ProductQuantity is decimal pq)
                    lines.Add($"Ürün: {FormatDec(pq)}{UnitSuffix(e.ProductUnit ?? "kg")}");
                if (e.CrateCount is int cc)
                    lines.Add($"Kasa sayısı: {cc}");
                break;
            case TaskThemes.Bakim:
                if (!string.IsNullOrWhiteSpace(e.Description))
                    lines.Add($"Açıklama: {e.Description.Trim()}");
                break;
            default:
                if (!string.IsNullOrWhiteSpace(e.Description))
                    lines.Add(e.Description.Trim());
                break;
        }

        return lines;
    }

    private static Result ValidateSulama(TaskEvidenceDto e, bool planned = false)
    {
        if (e.DurationMinutes is null or <= 0)
            return Fail(planned ? "Planlanan sulama süresi (dakika) gerekli." : "Sulama süresi (dakika) gerekli.");
        if (e.WaterAmount is null or <= 0)
            return Fail(planned ? "Planlanan su miktarı gerekli." : "Kullanılan su miktarı gerekli.");
        return Result.Success();
    }

    private static Result ValidateGubreleme(TaskEvidenceDto e, bool planned = false)
    {
        if (string.IsNullOrWhiteSpace(e.FertilizerName))
            return Fail(planned ? "Planlanan gübre adı gerekli." : "Gübre adı gerekli.");
        if (e.Amount is null or <= 0)
            return Fail(planned ? "Planlanan gübre miktarı gerekli." : "Gübre miktarı gerekli.");
        return Result.Success();
    }

    private static Result ValidateIlaclama(TaskEvidenceDto e, bool planned = false)
    {
        if (string.IsNullOrWhiteSpace(e.PesticideName))
            return Fail(planned ? "Planlanan ilaç adı gerekli." : "İlaç adı gerekli.");
        if (string.IsNullOrWhiteSpace(e.Dose))
            return Fail(planned ? "Planlanan ilaç dozu gerekli." : "İlaç dozu gerekli.");
        if (e.WaterAmount is null or <= 0)
            return Fail(planned ? "Planlanan su miktarı gerekli." : "Su miktarı gerekli.");
        return Result.Success();
    }

    private static Result ValidateDikim(TaskEvidenceDto e)
    {
        if (e.SeedlingCount is null or <= 0)
            return Fail("Fide sayısı gerekli.");
        if (e.StartedAt is null)
            return Fail("Başlangıç zamanı gerekli.");
        if (e.EndedAt is null)
            return Fail("Bitiş zamanı gerekli.");
        if (e.EndedAt < e.StartedAt)
            return Fail("Bitiş zamanı başlangıçtan önce olamaz.");
        return Result.Success();
    }

    private static Result ValidateDikimPlanned(TaskEvidenceDto e)
    {
        if (e.SeedlingCount is null or <= 0)
            return Fail("Planlanan fide sayısı gerekli.");
        return Result.Success();
    }

    private static Result ValidateHasat(TaskEvidenceDto e, bool planned = false)
    {
        if (e.ProductQuantity is null or <= 0)
            return Fail(planned ? "Planlanan ürün miktarı gerekli." : "Ürün miktarı gerekli.");
        if (e.CrateCount is null or < 0)
            return Fail(planned ? "Planlanan kasa sayısı gerekli." : "Kasa sayısı gerekli.");
        return Result.Success();
    }

    private static Result ValidateBakim(TaskEvidenceDto e, bool planned = false)
    {
        if (string.IsNullOrWhiteSpace(e.Description))
            return Fail(planned ? "Planlanan bakım açıklaması gerekli." : "Bakım açıklaması gerekli.");
        return Result.Success();
    }

    private static Result Fail(string message) =>
        Result.Failure(new Error("Task.EvidenceInvalid", message));

    private static string FormatDec(decimal value) =>
        value.ToString("0.##", CultureInfo.GetCultureInfo("tr-TR"));

    private static string UnitSuffix(string? unit) =>
        string.IsNullOrWhiteSpace(unit) ? string.Empty : $" {unit.Trim()}";
}
