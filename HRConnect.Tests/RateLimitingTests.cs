using System.Net;
using HRConnect.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HRConnect.Tests;

public class RateLimitingTests : IClassFixture<RateLimitingTests.RateLimitingWebAppFactory>
{
    private readonly RateLimitingWebAppFactory _factory;

    public RateLimitingTests(RateLimitingWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Requests_ExceedingDefaultPermitLimit_ReturnTooManyRequests()
    {
        // Arrange
        using var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("http://localhost")
        });

        // Act
        HttpResponseMessage? lastResponse = null;
        for (var i = 0; i < 101; i++)
        {
            lastResponse = await client.GetAsync("/rate-limit-probe");
        }

        // Assert
        Assert.NotNull(lastResponse);
        Assert.Equal(HttpStatusCode.TooManyRequests, lastResponse!.StatusCode);

        var body = await lastResponse.Content.ReadAsStringAsync();
        Assert.Contains("Too many requests", body);
    }

    public class RateLimitingWebAppFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                var testConfig = new Dictionary<string, string?>
                {
                    ["Jwt:SecretKey"] = "test-secret-key-that-is-long-enough-for-jwt-signing",
                    ["Jwt:Issuer"] = "HRConnect.API",
                    ["Jwt:Audience"] = "HRConnect.UI"
                };

                configBuilder.AddInMemoryCollection(testConfig);
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<HRConnectDbContext>));

                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<HRConnectDbContext>(options =>
                    options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
            });
        }
    }
}
