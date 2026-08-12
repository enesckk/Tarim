using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.DataProtection;
using Agriculture.Modules.Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Agriculture.Api.IntegrationTests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(
        Path.GetTempPath(), $"agriculture-tests-{Guid.NewGuid():N}.sqlite");
    private readonly string _keysPath = Path.Combine(
        Path.GetTempPath(), $"agriculture-test-keys-{Guid.NewGuid():N}");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={_databasePath}",
                ["Database:ApplyMigrationsOnStartup"] = "true",
                ["Database:SeedDemoData"] = "true",
                ["Minio:Enabled"] = "false",
                ["ConnectionStrings:Redis"] = null
            });
        });
        builder.ConfigureServices(services =>
        {
            Directory.CreateDirectory(_keysPath);
            services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(_keysPath));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (File.Exists(_databasePath))
            File.Delete(_databasePath);
        if (Directory.Exists(_keysPath))
            Directory.Delete(_keysPath, recursive: true);
    }
}

public sealed class ApiSecurityTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory = factory;
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Liveness_and_database_readiness_are_healthy()
    {
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/health/live")).StatusCode);
        using var ready = await _client.GetAsync("/health/ready");
        var body = await ready.Content.ReadAsStringAsync();
        Assert.True(ready.StatusCode == HttpStatusCode.OK, body);
    }

    [Theory]
    [InlineData("/api/tasks/today")]
    [InlineData("/api/me")]
    public async Task Protected_api_rejects_anonymous_requests(string path)
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task SignalR_rejects_anonymous_and_accepts_authenticated_producer()
    {
        using var anonymous = await _client.PostAsync(
            "/hubs/notifications/negotiate?negotiateVersion=1", null);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var login = await LoginAsync("uretici@agriculture.local", "Producer123!");
        using var request = new HttpRequestMessage(
            HttpMethod.Post, "/hubs/notifications/negotiate?negotiateVersion=1");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        using var authenticated = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, authenticated.StatusCode);
    }

    [Fact]
    public async Task Producer_cannot_access_staff_or_cross_producer_lists()
    {
        var login = await LoginAsync("uretici@agriculture.local", "Producer123!");
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.AccessToken);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await _client.GetAsync("/api/staff/officers")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await _client.GetAsync("/api/producers")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await _client.GetAsync("/api/tasks/pending-approval")).StatusCode);
    }

    [Fact]
    public async Task Refresh_token_is_rotated_and_cannot_be_replayed()
    {
        var login = await LoginAsync("uretici@agriculture.local", "Producer123!");
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var identityDb = scope.ServiceProvider.GetRequiredService<IdentityDbContext>();
            Assert.False(await identityDb.Users.AnyAsync(u => u.RefreshToken == login.RefreshToken));
        }
        using var refreshed = await _client.PostAsJsonAsync(
            "/api/auth/refresh", new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, refreshed.StatusCode);
        var next = await refreshed.Content.ReadFromJsonAsync<LoginResponse>();
        Assert.NotNull(next);
        Assert.NotEqual(login.RefreshToken, next.RefreshToken);
        using var replay = await _client.PostAsJsonAsync(
            "/api/auth/refresh", new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
    }

    [Fact]
    public async Task Application_errors_use_problem_details_and_semantic_status_codes()
    {
        var login = await LoginAsync("admin@agriculture.local", "Admin123!");
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.AccessToken);

        using var response = await _client.GetAsync($"/api/producers/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("Producer.NotFound", body.RootElement.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Photo_upload_rejects_spoofed_image_content()
    {
        var login = await LoginAsync("uretici@agriculture.local", "Producer123!");
        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.AccessToken);
        using var tasksResponse = await _client.GetAsync("/api/tasks/today");
        tasksResponse.EnsureSuccessStatusCode();
        using var tasks = JsonDocument.Parse(await tasksResponse.Content.ReadAsStringAsync());
        var taskId = tasks.RootElement[0].GetProperty("id").GetGuid();

        using var content = new MultipartFormDataContent();
        using var fakeImage = new ByteArrayContent(Encoding.UTF8.GetBytes("this is not an image"));
        fakeImage.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fakeImage, "file", "spoof.jpg");
        using var response = await _client.PostAsync($"/api/tasks/{taskId}/photos", content);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<LoginResponse> LoginAsync(string email, string password)
    {
        using var response = await _client.PostAsJsonAsync(
            "/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<LoginResponse>())!;
    }

    private sealed record LoginResponse(string AccessToken, string RefreshToken);
}
