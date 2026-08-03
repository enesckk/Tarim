namespace Agriculture.Application.Abstractions.Storage;

public interface IStorageService
{
    Task<string> UploadFileAsync(string bucketName, string objectName, Stream data, string contentType, CancellationToken cancellationToken = default);
    Task<Stream> GetFileAsync(string bucketName, string objectName, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string bucketName, string objectName, CancellationToken cancellationToken = default);
    Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expiryInSeconds = 3600);
}
