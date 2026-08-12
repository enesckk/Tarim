using Agriculture.Application.Abstractions.Storage;
using Microsoft.Extensions.Hosting;

namespace Agriculture.Infrastructure.Storage;

public sealed class LocalStorageService(IHostEnvironment environment) : IStorageService
{
    private readonly string _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "wwwroot"));

    public async Task<string> UploadFileAsync(string bucketName, string objectName, Stream data, string contentType, CancellationToken cancellationToken = default)
    {
        var path = Resolve(objectName);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var output = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, true);
        await data.CopyToAsync(output, cancellationToken);
        return objectName.Replace('\\', '/');
    }

    public Task<Stream> GetFileAsync(string bucketName, string objectName, CancellationToken cancellationToken = default)
    {
        Stream stream = new FileStream(Resolve(objectName), FileMode.Open, FileAccess.Read, FileShare.Read, 81920, true);
        return Task.FromResult(stream);
    }

    public Task DeleteFileAsync(string bucketName, string objectName, CancellationToken cancellationToken = default)
    {
        var path = Resolve(objectName);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expiryInSeconds = 3600)
        => Task.FromResult("/api/files/" + objectName.Replace('\\', '/').TrimStart('/'));

    private string Resolve(string objectName)
    {
        var key = objectName.Replace('\\', '/').TrimStart('/');
        if (!key.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase) || key.Contains("..") || key.Contains(':'))
            throw new InvalidOperationException("Geçersiz depolama yolu.");
        var full = Path.GetFullPath(Path.Combine(_root, key.Replace('/', Path.DirectorySeparatorChar)));
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Geçersiz depolama yolu.");
        return full;
    }
}
