using HRConnect.API.DTOs;
using HRConnect.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HRConnect.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    string GenerateToken(User user);
}

public class AuthService : IAuthService
{
    private readonly HRConnect.API.Data.HRConnectDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(HRConnect.API.Data.HRConnectDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return new AuthResponse { Success = false, Message = "Email already exists" };
        }

        var user = new User
        {
            Email = request.Email,
            FullName = request.FullName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsAdmin = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Create Employee record for the new user
        var employee = new Employee
        {
            UserId = user.Id,
            Department = "General",
            Designation = "Employee",
            JoiningDate = DateTime.UtcNow
        };
        _context.Employees.Add(employee);

        // Initialize leave balances
        var leaveTypes = Enum.GetValues(typeof(LeaveType)).Cast<LeaveType>();
        foreach (var leaveType in leaveTypes)
        {
            var leaveBalance = new LeaveBalance
            {
                EmployeeId = employee.Id,
                LeaveType = leaveType,
                TotalDays = 20,
                UsedDays = 0,
                Year = DateTime.UtcNow.Year
            };
            _context.LeaveBalances.Add(leaveBalance);
        }

        await _context.SaveChangesAsync();

        var token = GenerateToken(user);
        return new AuthResponse
        {
            Success = true,
            Message = "Registration successful",
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                IsAdmin = user.IsAdmin
            }
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return new AuthResponse { Success = false, Message = "Invalid email or password" };
        }

        var token = GenerateToken(user);
        return new AuthResponse
        {
            Success = true,
            Message = "Login successful",
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                IsAdmin = user.IsAdmin
            }
        };
    }

    public string GenerateToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured"));

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim("isAdmin", user.IsAdmin.ToString())
            }),
            Expires = DateTime.UtcNow.AddDays(7),
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
