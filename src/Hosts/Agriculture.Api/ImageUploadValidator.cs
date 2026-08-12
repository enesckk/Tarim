internal sealed record ValidatedImage(string ContentType, string Extension);

internal static class ImageUploadValidator
{
    public const long MaxBytes = 10 * 1024 * 1024;

    public static async Task<ValidatedImage> ValidateAsync(
        Stream stream,
        string? declaredContentType,
        CancellationToken cancellationToken = default)
    {
        if (!stream.CanSeek)
            throw new InvalidOperationException("Dosya akışı doğrulanamıyor.");
        if (stream.Length <= 0)
            throw new InvalidOperationException("Dosya boş.");
        if (stream.Length > MaxBytes)
            throw new InvalidOperationException("Görsel en fazla 10 MB olabilir.");

        var start = stream.Position;
        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(), cancellationToken);
        stream.Position = start;

        var detected = Detect(header.AsSpan(0, read))
            ?? throw new InvalidOperationException("Dosya içeriği geçerli bir JPEG, PNG veya WebP görseli değil.");
        var declared = declaredContentType?.Split(';', 2)[0].Trim();
        if (string.Equals(declared, "image/jpg", StringComparison.OrdinalIgnoreCase))
            declared = "image/jpeg";
        if (!string.IsNullOrWhiteSpace(declared)
            && !string.Equals(declared, detected.ContentType, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Dosya içeriği ile bildirilen görsel türü uyuşmuyor.");
        }

        return detected;
    }

    private static ValidatedImage? Detect(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
            return new("image/jpeg", ".jpg");
        if (bytes.Length >= 8
            && bytes[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
            return new("image/png", ".png");
        if (bytes.Length >= 12
            && bytes[..4].SequenceEqual("RIFF"u8)
            && bytes.Slice(8, 4).SequenceEqual("WEBP"u8))
            return new("image/webp", ".webp");
        return null;
    }
}
