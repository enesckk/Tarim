using System.Net.Http.Headers;

internal static class TarimAiProxyEndpoints
{
    private static readonly HashSet<string> HopByHopHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization",
        "TE", "Trailer", "Transfer-Encoding", "Upgrade", "Host"
    };

    public static RouteGroupBuilder MapTarimAiProxyEndpoints(
        this RouteGroupBuilder api,
        IConfiguration configuration)
    {
        api.MapMethods("/tarim-ai/{**path}",
            ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            async (HttpContext context, IHttpClientFactory clients, string? path, CancellationToken ct) =>
            {
                var baseUrl = configuration["TarimAi:BaseUrl"];
                if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var serviceUri))
                    return Results.Problem("Tarım AI servisi yapılandırılmamış.", statusCode: 503);

                var target = new Uri(serviceUri, $"/{path ?? string.Empty}{context.Request.QueryString}");
                using var request = new HttpRequestMessage(new HttpMethod(context.Request.Method), target);
                var integrationKey = configuration["TarimAi:IntegrationApiKey"];
                if (string.IsNullOrWhiteSpace(integrationKey))
                    return Results.Problem("Tarım AI servis anahtarı yapılandırılmamış.", statusCode: 503);
                request.Headers.TryAddWithoutValidation("X-TarimAi-Key", integrationKey);

                if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding"))
                    request.Content = new StreamContent(context.Request.Body);

                foreach (var header in context.Request.Headers)
                {
                    if (HopByHopHeaders.Contains(header.Key)
                        || header.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase)
                        || header.Key.Equals("X-TarimAi-Key", StringComparison.OrdinalIgnoreCase))
                        continue;
                    if (!request.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                        request.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                }

                var response = await clients.CreateClient().SendAsync(
                    request,
                    HttpCompletionOption.ResponseHeadersRead,
                    ct);

                context.Response.StatusCode = (int)response.StatusCode;
                foreach (var header in response.Headers.Concat(response.Content.Headers))
                {
                    if (!HopByHopHeaders.Contains(header.Key))
                        context.Response.Headers[header.Key] = header.Value.ToArray();
                }
                context.Response.Headers.Remove("transfer-encoding");
                await response.Content.CopyToAsync(context.Response.Body, ct);
                response.Dispose();
                return Results.Empty;
            })
            .WithTags("TarimAiProxy")
            .AllowAnonymous();

        return api;
    }
}
