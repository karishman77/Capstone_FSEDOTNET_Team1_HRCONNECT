using HRConnect.API.Data;
using HRConnect.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AutoMapper;
using HRConnect.API.Models;
using HRConnect.API.DTOs;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database


var host = Environment.GetEnvironmentVariable("PGHOST");
var port = Environment.GetEnvironmentVariable("PGPORT");
var database = Environment.GetEnvironmentVariable("PGDATABASE");
var user = Environment.GetEnvironmentVariable("PGUSER");
var password = Environment.GetEnvironmentVariable("PGPASSWORD");

var connectionString =
    $"Host={host};" +
    $"Port={port};" +
    $"Database={database};" +
    $"Username={user};" +
    $"Password={password};" +
    $"SSL Mode=Require;" +
    $"Trust Server Certificate=true";

Console.WriteLine("================================");
Console.WriteLine(connectionString);
Console.WriteLine("================================");

builder.Services.AddDbContext<HRConnectDbContext>(options =>
    options.UseNpgsql(connectionString));

//Console.WriteLine("================================");
//Console.WriteLine(builder.Configuration.GetConnectionString("DefaultConnection"));
//Console.WriteLine("================================");

//builder.Services.AddDbContext<HRConnectDbContext>(options =>
  //  options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// AutoMapper
builder.Services.AddAutoMapper(cfg =>
{
    cfg.CreateMap<User, UserDto>();
    cfg.CreateMap<Employee, EmployeeDto>();
    cfg.CreateMap<LeaveRequest, LeaveRequestDto>();
    cfg.CreateMap<LeaveBalance, LeaveBalanceDto>()
        .ForMember(dest => dest.RemainingDays, opt => opt.MapFrom(src => src.RemainingDays));
});

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddScoped<INotificationService, NotificationService>();

// JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = Encoding.ASCII.GetBytes(jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured"));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// Authorization Policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAssertion(context =>
            context.User.FindFirst("isAdmin")?.Value == "True"));
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

// Rate limiting
var rateLimitSection = builder.Configuration.GetSection("RateLimiting");
var permitLimit = rateLimitSection.GetValue<int?>("PermitLimit") ?? 100;
var windowSeconds = rateLimitSection.GetValue<int?>("WindowSeconds") ?? 60;
var queueLimit = rateLimitSection.GetValue<int?>("QueueLimit") ?? 0;

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            "{\"message\":\"Too many requests. Please try again later.\"}",
            cancellationToken);
    };

    options.AddFixedWindowLimiter("GlobalPolicy", limiterOptions =>
    {
        limiterOptions.PermitLimit = permitLimit;
        limiterOptions.Window = TimeSpan.FromSeconds(windowSeconds);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = queueLimit;
        limiterOptions.AutoReplenishment = true;
    });
});

var app = builder.Build();

// Middleware
if (true) // temporarily enable for QA
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAll");
app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireRateLimiting("GlobalPolicy");

if (app.Environment.IsEnvironment("Testing"))
{
    app.MapGet("/rate-limit-probe", () => Results.Text("ok"))
        .RequireRateLimiting("GlobalPolicy");
}

// Database Migration
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<HRConnectDbContext>();
    db.Database.Migrate();
    await SeedData(db);
}

app.Run();

async Task SeedData(HRConnectDbContext context)
{
    if (await context.Users.AnyAsync())
        return;

    var adminUser = new HRConnect.API.Models.User
    {
        Id = Guid.NewGuid(),
        Email = "admin@example.com",
        FullName = "HR Admin",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
        IsAdmin = true
    };

    context.Users.Add(adminUser);
    await context.SaveChangesAsync();

    var adminEmployee = new HRConnect.API.Models.Employee
    {
        Id = Guid.NewGuid(),
        UserId = adminUser.Id,
        Department = "HR",
        Designation = "HR Manager",
        JoiningDate = DateTime.UtcNow.AddYears(-5)
    };

    context.Employees.Add(adminEmployee);
    await context.SaveChangesAsync();

    // Seed leave balances for admin
    var leaveTypes = Enum.GetValues(typeof(LeaveType)).Cast<LeaveType>();
    foreach (var leaveType in leaveTypes)
    {
        var leaveBalance = new HRConnect.API.Models.LeaveBalance
        {
            EmployeeId = adminEmployee.Id,
            LeaveType = leaveType,
            TotalDays = 20,
            UsedDays = 0,
            Year = DateTime.UtcNow.Year
        };
        context.LeaveBalances.Add(leaveBalance);
    }

    await context.SaveChangesAsync();
}

public partial class Program { }
