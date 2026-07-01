using Xunit;
using Moq;
using HRConnect.API.Services;
using HRConnect.API.DTOs;
using HRConnect.API.Data;
using HRConnect.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace HRConnect.Tests;

public class AuthServiceTests
{
    private HRConnectDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<HRConnectDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new HRConnectDbContext(options);
    }

    [Fact]
    public async Task RegisterAsync_WithValidEmail_ShouldSucceed()
    {
        // Arrange
        var context = CreateDbContext();
        var configMock = new Dictionary<string, string>
        {
            { "Jwt:SecretKey", "test-secret-key-that-is-long-enough" },
            { "Jwt:Issuer", "HRConnect.API" },
            { "Jwt:Audience", "HRConnect.UI" }
        };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configMock)
            .Build();

        var service = new AuthService(context, config);

        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "Password@123",
            FullName = "Test User"
        };

        // Act
        var result = await service.RegisterAsync(request);

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.Token);
        Assert.NotNull(result.User);
        Assert.Equal("test@example.com", result.User.Email);
    }

    [Fact]
    public async Task RegisterAsync_WithDuplicateEmail_ShouldFail()
    {
        // Arrange
        var context = CreateDbContext();
        var existingUser = new User
        {
            Email = "test@example.com",
            FullName = "Existing User",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password@123")
        };
        context.Users.Add(existingUser);
        await context.SaveChangesAsync();

        var configMock = new Dictionary<string, string>
        {
            { "Jwt:SecretKey", "test-secret-key-that-is-long-enough" },
            { "Jwt:Issuer", "HRConnect.API" },
            { "Jwt:Audience", "HRConnect.UI" }
        };
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(configMock)
            .Build();
        
        var service = new AuthService(context, config);

        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "Password@123",
            FullName = "New User"
        };

        // Act
        var result = await service.RegisterAsync(request);

        // Assert
        Assert.False(result.Success);
        Assert.Equal("Email already exists", result.Message);
    }
}
