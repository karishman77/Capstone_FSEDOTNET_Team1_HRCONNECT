using AutoMapper;
using HRConnect.API.Data;
using HRConnect.API.DTOs;
using HRConnect.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace HRConnect.API.Services;

public interface IEmployeeService
{
    Task<EmployeeDto?> GetByIdAsync(Guid id);
    Task<EmployeeDto?> GetByUserIdAsync(Guid userId);
    Task<List<EmployeeDto>> GetAllAsync();
    Task<List<EmployeeDto>> SearchAsync(string? name, string? department);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request);
    Task<EmployeeDto?> UpdateAsync(Guid id, UpdateEmployeeRequest request);
    Task<bool> DeleteAsync(Guid id);
}

public class EmployeeService : IEmployeeService
{
    private readonly HRConnectDbContext _context;
    private readonly IMapper _mapper;

    public EmployeeService(HRConnectDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<EmployeeDto?> GetByIdAsync(Guid id)
    {
        var employee = await _context.Employees.Include(e => e.User).FirstOrDefaultAsync(e => e.Id == id);
        return employee == null ? null : _mapper.Map<EmployeeDto>(employee);
    }

    public async Task<EmployeeDto?> GetByUserIdAsync(Guid userId)
    {
        var employee = await _context.Employees.Include(e => e.User).FirstOrDefaultAsync(e => e.UserId == userId);
        return employee == null ? null : _mapper.Map<EmployeeDto>(employee);
    }

    public async Task<List<EmployeeDto>> GetAllAsync()
    {
        var employees = await _context.Employees.Include(e => e.User).ToListAsync();
        return _mapper.Map<List<EmployeeDto>>(employees);
    }

    public async Task<List<EmployeeDto>> SearchAsync(string? name, string? department)
    {
        var query = _context.Employees.Include(e => e.User).AsQueryable();

        if (!string.IsNullOrEmpty(name))
        {
            query = query.Where(e => e.User!.FullName.Contains(name));
        }

        if (!string.IsNullOrEmpty(department))
        {
            query = query.Where(e => e.Department.Contains(department));
        }

        var employees = await query.ToListAsync();
        return _mapper.Map<List<EmployeeDto>>(employees);
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required.");
        }

        // Validate email format
        var emailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase);
        if (!emailRegex.IsMatch(request.Email))
        {
            throw new ArgumentException("Please enter a valid email address (e.g., user@example.com)");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            throw new ArgumentException("Full name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Department))
        {
            throw new ArgumentException("Department is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Designation))
        {
            throw new ArgumentException("Designation is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            throw new ArgumentException("Password is required.");
        }

        if (request.JoiningDate == default)
        {
            throw new ArgumentException("Joining date is required.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedDepartment = request.Department.Trim();
        var normalizedDesignation = request.Designation.Trim();
        var normalizedPassword = request.Password.Trim();

        if (normalizedPassword.Length < 8)
        {
            throw new ArgumentException("Password must be at least 8 characters long.");
        }

        var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (emailExists)
        {
            throw new ArgumentException("An employee with this email already exists.");
        }

        var joiningDate = request.JoiningDate.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(request.JoiningDate, DateTimeKind.Utc)
            : request.JoiningDate.ToUniversalTime();

        var user = new User
        {
            Email = normalizedEmail,
            FullName = request.FullName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(normalizedPassword),
            IsAdmin = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            Department = normalizedDepartment,
            Designation = normalizedDesignation,
            JoiningDate = joiningDate
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
        
        employee = await _context.Employees.Include(e => e.User).FirstAsync(e => e.Id == employee.Id);
        return _mapper.Map<EmployeeDto>(employee);
    }

    public async Task<EmployeeDto?> UpdateAsync(Guid id, UpdateEmployeeRequest request)
    {
        var employee = await _context.Employees.Include(e => e.User).FirstOrDefaultAsync(e => e.Id == id);
        if (employee == null) return null;

        var joiningDate = request.JoiningDate.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(request.JoiningDate, DateTimeKind.Utc)
            : request.JoiningDate.ToUniversalTime();

        employee.Department = request.Department;
        employee.Designation = request.Designation;
        employee.JoiningDate = joiningDate;
        employee.UpdatedAt = DateTime.UtcNow;

        _context.Employees.Update(employee);
        await _context.SaveChangesAsync();

        return _mapper.Map<EmployeeDto>(employee);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id);
        if (employee == null) return false;

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();
        return true;
    }
}
