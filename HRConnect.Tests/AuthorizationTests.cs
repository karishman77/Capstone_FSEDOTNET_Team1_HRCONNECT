using System.Net;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HRConnect.API.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace HRConnect.Tests;

public class AuthorizationTests : IClassFixture<AuthorizationTests.AuthorizationWebAppFactory>
{
    private readonly AuthorizationWebAppFactory _factory;

    public AuthorizationTests(AuthorizationWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Employees_List_ShouldReturnForbidden_ForNonAdminUser()
    {
        using var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("http://localhost")
        });

        var token = CreateToken(isAdmin: false);
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var employeesResponse = await client.GetAsync("/api/employees");
        Assert.Equal(HttpStatusCode.Forbidden, employeesResponse.StatusCode);
    }

    private static string CreateToken(bool isAdmin)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new("isAdmin", isAdmin ? "True" : "False")
        };

        var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes("your-super-secret-key-change-this-in-production-at-least-32-characters-long"));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: "HRConnect.API",
            audience: "HRConnect.UI",
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public class AuthorizationWebAppFactory : WebApplicationFactory<Program>
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
