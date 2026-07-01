using AutoMapper;
using HRConnect.API.Data;
using HRConnect.API.DTOs;
using HRConnect.API.Models;
using HRConnect.API.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace HRConnect.Tests;

public class LeaveServiceTests
{
    private static HRConnectDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<HRConnectDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new HRConnectDbContext(options);
    }

    private static IMapper CreateMapper()
    {
        var config = new MapperConfiguration(cfg =>
        {
            cfg.CreateMap<User, UserDto>();
            cfg.CreateMap<Employee, EmployeeDto>();
            cfg.CreateMap<LeaveRequest, LeaveRequestDto>();
            cfg.CreateMap<LeaveBalance, LeaveBalanceDto>()
                .ForMember(dest => dest.RemainingDays, opt => opt.MapFrom(src => src.RemainingDays));
        });

        return config.CreateMapper();
    }

    [Fact]
    public async Task CreateAsync_WhenRequestedDaysExceedBalance_ShouldThrow()
    {
        var context = CreateDbContext();
        var mapper = CreateMapper();
        var notificationMock = new Mock<INotificationService>();

        var user = new User
        {
            Email = "leave.user@example.com",
            FullName = "Leave User",
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = "QA",
            Designation = "Tester",
            JoiningDate = DateTime.UtcNow.AddMonths(-3)
        };

        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        context.LeaveBalances.Add(new LeaveBalance
        {
            EmployeeId = employee.Id,
            LeaveType = LeaveType.Casual,
            TotalDays = 12,
            UsedDays = 0,
            Year = 2026
        });

        await context.SaveChangesAsync();

        var service = new LeaveService(context, mapper, notificationMock.Object);

        var request = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = new DateTime(2026, 7, 1),
            EndDate = new DateTime(2026, 7, 13),
            Reason = "Long leave"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(employee.Id, request));
        Assert.Contains("Insufficient Casual leave balance", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenRequestedDaysWithinBalance_ShouldSucceed()
    {
        var context = CreateDbContext();
        var mapper = CreateMapper();
        var notificationMock = new Mock<INotificationService>();

        var user = new User
        {
            Email = "leave.ok@example.com",
            FullName = "Leave OK",
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = "QA",
            Designation = "Tester",
            JoiningDate = DateTime.UtcNow.AddMonths(-3)
        };

        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        context.LeaveBalances.Add(new LeaveBalance
        {
            EmployeeId = employee.Id,
            LeaveType = LeaveType.Casual,
            TotalDays = 12,
            UsedDays = 0,
            Year = 2026
        });

        await context.SaveChangesAsync();

        var service = new LeaveService(context, mapper, notificationMock.Object);

        var request = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = new DateTime(2026, 7, 1),
            EndDate = new DateTime(2026, 7, 5),
            Reason = "Short leave"
        };

        var result = await service.CreateAsync(employee.Id, request);

        Assert.NotNull(result);
        Assert.Equal("Pending", result.Status);
        Assert.Equal(5, result.NumberOfDays);
    }

    [Fact]
    public async Task CreateAsync_WhenReasonIsBlank_ShouldThrow()
    {
        var context = CreateDbContext();
        var mapper = CreateMapper();
        var notificationMock = new Mock<INotificationService>();

        var user = new User
        {
            Email = "leave.blankreason@example.com",
            FullName = "Leave Blank Reason",
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = "QA",
            Designation = "Tester",
            JoiningDate = DateTime.UtcNow.AddMonths(-3)
        };

        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        context.LeaveBalances.Add(new LeaveBalance
        {
            EmployeeId = employee.Id,
            LeaveType = LeaveType.Casual,
            TotalDays = 20,
            UsedDays = 0,
            Year = 2026
        });

        await context.SaveChangesAsync();

        var service = new LeaveService(context, mapper, notificationMock.Object);

        var request = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = new DateTime(2026, 7, 1),
            EndDate = new DateTime(2026, 7, 2),
            Reason = "  "
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(employee.Id, request));
        Assert.Contains("Reason must be at least 3 characters", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenDatesAreMissing_ShouldThrow()
    {
        var context = CreateDbContext();
        var mapper = CreateMapper();
        var notificationMock = new Mock<INotificationService>();

        var user = new User
        {
            Email = "leave.missingdates@example.com",
            FullName = "Leave Missing Dates",
            PasswordHash = "hash"
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = "QA",
            Designation = "Tester",
            JoiningDate = DateTime.UtcNow.AddMonths(-3)
        };

        context.Employees.Add(employee);
        await context.SaveChangesAsync();

        var service = new LeaveService(context, mapper, notificationMock.Object);

        var request = new CreateLeaveRequestDto
        {
            LeaveType = "Casual",
            StartDate = default,
            EndDate = new DateTime(2026, 7, 2),
            Reason = "Need leave"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(employee.Id, request));
        Assert.Contains("Start date and end date are required", ex.Message);
    }
}
