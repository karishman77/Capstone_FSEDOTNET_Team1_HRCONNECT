using HRConnect.API.DTOs;
using HRConnect.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;

namespace HRConnect.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    string GenerateToken(User user);
    Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request);
}

public class AuthService : IAuthService
{
    private readonly HRConnect.API.Data.HRConnectDbContext _context;
    private readonly IConfiguration _configuration;

    // Demo: In-memory storage for password reset codes (email -> (code, expiration))
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (string Code, DateTime Expiration)> _resetCodes = new();

    public AuthService(HRConnect.API.Data.HRConnectDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Validate email
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return new AuthResponse { Success = false, Message = "Email is required" };
        }

        var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
        if (!emailRegex.IsMatch(request.Email))
        {
            return new AuthResponse { Success = false, Message = "Please enter a valid email address" };
        }

        // Validate full name
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return new AuthResponse { Success = false, Message = "Full name is required" };
        }

        // Only allow alphabetic characters and spaces
        var nameRegex = new Regex(@"^[a-zA-Z\s]+$", RegexOptions.IgnoreCase);
        if (!nameRegex.IsMatch(request.FullName))
        {
            return new AuthResponse { Success = false, Message = "Full name can only contain letters and spaces" };
        }

        if (request.FullName.Trim().Length < 2)
        {
            return new AuthResponse { Success = false, Message = "Full name must be at least 2 characters long" };
        }

        // Validate password
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return new AuthResponse { Success = false, Message = "Password is required" };
        }

        if (request.Password.Length < 8)
        {
            return new AuthResponse { Success = false, Message = "Password must be at least 8 characters long" };
        }

        // Strong password validation
        var hasUpperCase = request.Password.Any(char.IsUpper);
        var hasLowerCase = request.Password.Any(char.IsLower);
        var hasNumber = request.Password.Any(char.IsDigit);
        var hasSpecialChar = new Regex(@"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]").IsMatch(request.Password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar)
        {
            return new AuthResponse { Success = false, Message = "Password must contain uppercase, lowercase, number, and special character" };
        }

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
        // Validate email
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return new AuthResponse { Success = false, Message = "Email is required" };
        }

        var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
        if (!emailRegex.IsMatch(request.Email))
        {
            return new AuthResponse { Success = false, Message = "Please enter a valid email address" };
        }

        // Validate password
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return new AuthResponse { Success = false, Message = "Password is required" };
        }

        if (request.Password.Length < 8)
        {
            return new AuthResponse { Success = false, Message = "Invalid email or password" };
        }

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

    public async Task<ForgotPasswordResponse> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        // Validate email
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return new ForgotPasswordResponse { Success = false, Message = "Email is required" };
        }

        var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
        if (!emailRegex.IsMatch(request.Email))
        {
            return new ForgotPasswordResponse { Success = false, Message = "Please enter a valid email address" };
        }

        // Check if user exists
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            // Don't reveal if email exists or not (security best practice)
            return new ForgotPasswordResponse
            {
                Success = true,
                Message = "If this email exists, a reset code has been generated",
                ResetCode = null
            };
        }

        // Generate 6-digit reset code
        var random = new Random();
        var resetCode = random.Next(100000, 999999).ToString();
        var expiration = DateTime.UtcNow.AddMinutes(15);

        // Store in memory (demo only - in production, store in database and send via email)
        _resetCodes[user.Email.ToLower()] = (resetCode, expiration);

        // Clean up expired codes
        var expiredKeys = _resetCodes.Where(kvp => kvp.Value.Expiration < DateTime.UtcNow).Select(kvp => kvp.Key).ToList();
        foreach (var key in expiredKeys)
        {
            _resetCodes.TryRemove(key, out _);
        }

        // DEMO MODE: Return the code in response (in production, send via email)
        return new ForgotPasswordResponse
        {
            Success = true,
            Message = "Password reset code generated successfully",
            ResetCode = resetCode // ONLY FOR DEMO - remove in production
        };
    }

    public async Task<AuthResponse> ResetPasswordAsync(ResetPasswordRequest request)
    {
        // Validate inputs
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return new AuthResponse { Success = false, Message = "Email is required" };
        }

        if (string.IsNullOrWhiteSpace(request.ResetCode))
        {
            return new AuthResponse { Success = false, Message = "Reset code is required" };
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return new AuthResponse { Success = false, Message = "New password is required" };
        }

        // Validate password strength
        if (request.NewPassword.Length < 8)
        {
            return new AuthResponse { Success = false, Message = "Password must be at least 8 characters long" };
        }

        var hasUpperCase = request.NewPassword.Any(char.IsUpper);
        var hasLowerCase = request.NewPassword.Any(char.IsLower);
        var hasNumber = request.NewPassword.Any(char.IsDigit);
        var hasSpecialChar = new Regex(@"[!@#$%^&*()_+\-=\[\]{};':""\\|,.<>\/?]").IsMatch(request.NewPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar)
        {
            return new AuthResponse { Success = false, Message = "Password must contain uppercase, lowercase, number, and special character" };
        }

        // Check reset code
        var emailKey = request.Email.ToLower();
        if (!_resetCodes.TryGetValue(emailKey, out var codeData))
        {
            return new AuthResponse { Success = false, Message = "Invalid or expired reset code" };
        }

        if (codeData.Code != request.ResetCode)
        {
            return new AuthResponse { Success = false, Message = "Invalid reset code" };
        }

        if (codeData.Expiration < DateTime.UtcNow)
        {
            _resetCodes.TryRemove(emailKey, out _);
            return new AuthResponse { Success = false, Message = "Reset code has expired" };
        }

        // Find user and update password
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
        {
            return new AuthResponse { Success = false, Message = "User not found" };
        }

        // Update password
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        // Remove used code
        _resetCodes.TryRemove(emailKey, out _);

        // Generate new token and log user in
        var token = GenerateToken(user);
        return new AuthResponse
        {
            Success = true,
            Message = "Password reset successful",
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
}
