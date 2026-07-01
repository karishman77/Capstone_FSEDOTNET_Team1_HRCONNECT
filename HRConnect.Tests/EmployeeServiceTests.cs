using Xunit;
using Moq;
using AutoMapper;
using HRConnect.API.Services;
using HRConnect.API.DTOs;
using HRConnect.API.Data;
using HRConnect.API.Models;
using Microsoft.EntityFrameworkCore;

namespace HRConnect.Tests;

public class EmployeeServiceTests
{
    private HRConnectDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<HRConnectDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new HRConnectDbContext(options);
    }

    private IMapper CreateMapper()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.CreateMap<User, UserDto>();
            cfg.CreateMap<Employee, EmployeeDto>();
        });
        return config.CreateMapper();
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllEmployees()
    {
        // Arrange
        var context = CreateDbContext();
        var user = new User { Email = "emp@test.com", FullName = "Employee", PasswordHash = "hash" };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = "IT",
            Designation = "Developer",
            JoiningDate = DateTime.Now
        };
        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        var mapper = CreateMapper();
        var service = new EmployeeService(context, mapper);

        // Act
        var result = await service.GetAllAsync();

        // Assert
        Assert.NotEmpty(result);
        Assert.Single(result);
        Assert.Equal(employee.Id, result[0].Id);
    }

    [Fact]
    public async Task DeleteAsync_WithValidId_ShouldSucceed()
    {
        // Arrange
        var context = CreateDbContext();
        var user = new User { Email = "emp@test.com", FullName = "Employee", PasswordHash = "hash" };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = "IT",
            Designation = "Developer",
            JoiningDate = DateTime.Now
        };
        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        var mapper = CreateMapper();
        var service = new EmployeeService(context, mapper);

        // Act
        var result = await service.DeleteAsync(employee.Id);

        // Assert
        Assert.True(result);
        var deletedEmployee = await context.Employees.FirstOrDefaultAsync(e => e.Id == employee.Id);
        Assert.Null(deletedEmployee);
    }
}
