using Agriculture.Application.Abstractions.Storage;
using Minio;
using Minio.DataModel.Args;

namespace Agriculture.Infrastructure.Storage;

public class MinioStorageService : IStorageService
{
    private readonly IMinioClient _minioClient;

    public MinioStorageService(IMinioClient minioClient)
    {
        _minioClient = minioClient;
    }

    public async Task<string> UploadFileAsync(string bucketName, string objectName, Stream data, string contentType, CancellationToken cancellationToken = default)
    {
        var bucketExistsArgs = new BucketExistsArgs().WithBucket(bucketName);
        var found = await _minioClient.BucketExistsAsync(bucketExistsArgs, cancellationToken);
        if (!found)
        {
            var makeBucketArgs = new MakeBucketArgs().WithBucket(bucketName);
            await _minioClient.MakeBucketAsync(makeBucketArgs, cancellationToken);
        }

        var putObjectArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithStreamData(data)
            .WithObjectSize(data.Length)
            .WithContentType(contentType);

        await _minioClient.PutObjectAsync(putObjectArgs, cancellationToken);
        return objectName;
    }

    public async Task<Stream> GetFileAsync(string bucketName, string objectName, CancellationToken cancellationToken = default)
    {
        var memoryStream = new MemoryStream();
        var getObjectArgs = new GetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithCallbackStream(stream =>
            {
                stream.CopyTo(memoryStream);
            });

        await _minioClient.GetObjectAsync(getObjectArgs, cancellationToken);
        memoryStream.Position = 0;
        return memoryStream;
    }

    public async Task DeleteFileAsync(string bucketName, string objectName, CancellationToken cancellationToken = default)
    {
        var removeObjectArgs = new RemoveObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);
        
        await _minioClient.RemoveObjectAsync(removeObjectArgs, cancellationToken);
    }

    public async Task<string> GetPresignedUrlAsync(string bucketName, string objectName, int expiryInSeconds = 3600)
    {
        var args = new PresignedGetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithExpiry(expiryInSeconds);

        return await _minioClient.PresignedGetObjectAsync(args);
    }
}
