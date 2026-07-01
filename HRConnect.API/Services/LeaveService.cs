using AutoMapper;
using HRConnect.API.Data;
using HRConnect.API.DTOs;
using HRConnect.API.Models;
using Microsoft.EntityFrameworkCore;

namespace HRConnect.API.Services;

public interface ILeaveService
{
    Task<LeaveRequestDto?> GetByIdAsync(Guid id);
    Task<List<LeaveRequestDto>> GetByEmployeeAsync(Guid employeeId);
    Task<List<LeaveRequestDto>> GetAllAsync();
    Task<LeaveRequestDto> CreateAsync(Guid employeeId, CreateLeaveRequestDto request);
    Task<LeaveRequestDto?> UpdateStatusAsync(Guid id, UpdateLeaveRequestStatusDto request);
    Task<bool> CancelAsync(Guid id);
    Task<List<LeaveBalanceDto>> GetLeaveBalancesAsync(Guid employeeId);
    Task<LeaveAnalyticsDto> GetAnalyticsAsync();
    Task<CarryForwardResultDto> ApplyCarryForwardAsync(int fromYear, int toYear, int maxCarryForwardDays = 5);
}

public class LeaveService : ILeaveService
{
    private readonly HRConnectDbContext _context;
    private readonly IMapper _mapper;
    private readonly INotificationService _notificationService;

    public LeaveService(HRConnectDbContext context, IMapper mapper, INotificationService notificationService)
    {
        _context = context;
        _mapper = mapper;
        _notificationService = notificationService;
    }

    public async Task<LeaveRequestDto?> GetByIdAsync(Guid id)
    {
        var leave = await _context.LeaveRequests.Include(l => l.Employee).ThenInclude(e => e!.User).FirstOrDefaultAsync(l => l.Id == id);
        return leave == null ? null : _mapper.Map<LeaveRequestDto>(leave);
    }

    public async Task<List<LeaveRequestDto>> GetByEmployeeAsync(Guid employeeId)
    {
        var leaves = await _context.LeaveRequests.Include(l => l.Employee).ThenInclude(e => e!.User).Where(l => l.EmployeeId == employeeId).ToListAsync();
        return _mapper.Map<List<LeaveRequestDto>>(leaves);
    }

    public async Task<List<LeaveRequestDto>> GetAllAsync()
    {
        var leaves = await _context.LeaveRequests.Include(l => l.Employee).ThenInclude(e => e!.User).ToListAsync();
        return _mapper.Map<List<LeaveRequestDto>>(leaves);
    }

    public async Task<LeaveRequestDto> CreateAsync(Guid employeeId, CreateLeaveRequestDto request)
    {
        if (request == null)
        {
            throw new ArgumentException("Leave request payload is required.");
        }

        if (string.IsNullOrWhiteSpace(request.LeaveType))
        {
            throw new ArgumentException("Leave type is required.");
        }

        if (request.StartDate == default || request.EndDate == default)
        {
            throw new ArgumentException("Start date and end date are required.");
        }

        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length < 3)
        {
            throw new ArgumentException("Reason must be at least 3 characters long.");
        }

        if (!Enum.TryParse<LeaveType>(request.LeaveType, true, out var leaveType))
        {
            throw new ArgumentException($"Invalid leave type: {request.LeaveType}");
        }

        // Ensure dates are UTC
        var startDate = request.StartDate.Kind == DateTimeKind.Unspecified 
            ? DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc)
            : request.StartDate.ToUniversalTime();
            
        var endDate = request.EndDate.Kind == DateTimeKind.Unspecified 
            ? DateTime.SpecifyKind(request.EndDate, DateTimeKind.Utc)
            : request.EndDate.ToUniversalTime();

        if (endDate < startDate)
        {
            throw new ArgumentException("End date cannot be earlier than start date.");
        }

        // Check for overlapping pending leaves
        var pendingOverlap = await _context.LeaveRequests.AnyAsync(l =>
            l.EmployeeId == employeeId &&
            l.Status == LeaveStatus.Pending &&
            l.StartDate <= endDate &&
            l.EndDate >= startDate);

        if (pendingOverlap)
        {
            throw new ArgumentException("You have already applied for leave on this date. Please check your pending requests.");
        }

        // Check for overlapping approved leaves
        var approvedOverlap = await _context.LeaveRequests.AnyAsync(l =>
            l.EmployeeId == employeeId &&
            l.Status == LeaveStatus.Approved &&
            l.StartDate <= endDate &&
            l.EndDate >= startDate);

        if (approvedOverlap)
        {
            throw new ArgumentException("You cannot apply for leave on this date as it is already approved. Please select different dates.");
        }

        var numberOfDays = (int)(endDate - startDate).TotalDays + 1;

        var leaveYear = startDate.Year;
        var leaveBalance = await _context.LeaveBalances.FirstOrDefaultAsync(lb =>
            lb.EmployeeId == employeeId &&
            lb.LeaveType == leaveType &&
            lb.Year == leaveYear);

        if (leaveBalance == null)
        {
            throw new ArgumentException($"No leave balance found for {leaveType} in {leaveYear}.");
        }

        if (numberOfDays > leaveBalance.RemainingDays)
        {
            throw new ArgumentException($"Insufficient {leaveType} leave balance. Remaining: {leaveBalance.RemainingDays} day(s), requested: {numberOfDays} day(s).");
        }

        var leaveRequest = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveType = leaveType,
            StartDate = startDate,
            EndDate = endDate,
            Reason = request.Reason.Trim(),
            NumberOfDays = numberOfDays,
            Status = LeaveStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.LeaveRequests.Add(leaveRequest);
        await _context.SaveChangesAsync();

        var leave = await _context.LeaveRequests.Include(l => l.Employee).ThenInclude(e => e!.User).FirstAsync(l => l.Id == leaveRequest.Id);
        return _mapper.Map<LeaveRequestDto>(leave);
    }

    public async Task<LeaveRequestDto?> UpdateStatusAsync(Guid id, UpdateLeaveRequestStatusDto request)
    {
        if (request == null)
        {
            throw new ArgumentException("Status update payload is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new ArgumentException("Status is required.");
        }

        var leave = await _context.LeaveRequests.Include(l => l.Employee).ThenInclude(e => e!.User).FirstOrDefaultAsync(l => l.Id == id);
        if (leave == null) return null;

        if (!Enum.TryParse<LeaveStatus>(request.Status, true, out var status))
        {
            throw new ArgumentException($"Invalid status: {request.Status}");
        }

        if (leave.Status == LeaveStatus.Pending && status != LeaveStatus.Approved && status != LeaveStatus.Rejected)
        {
            throw new ArgumentException("Pending requests can only be approved or rejected.");
        }

        if (leave.Status == LeaveStatus.ManagerApproved && status != LeaveStatus.Approved && status != LeaveStatus.Rejected)
        {
            throw new ArgumentException("Legacy manager-approved requests can only be approved or rejected.");
        }

        if (leave.Status == LeaveStatus.Approved || leave.Status == LeaveStatus.Rejected || leave.Status == LeaveStatus.Cancelled)
        {
            throw new ArgumentException("This request is already in a final state and cannot be changed.");
        }

        leave.Status = status;
        leave.AdminComments = request.AdminComments;
        leave.ApprovedAt = status == LeaveStatus.Approved ? DateTime.UtcNow : null;
        leave.UpdatedAt = DateTime.UtcNow;

        if (status == LeaveStatus.Approved)
        {
            var leaveBalance = await _context.LeaveBalances.FirstOrDefaultAsync(lb =>
                lb.EmployeeId == leave.EmployeeId && lb.LeaveType == leave.LeaveType && lb.Year == DateTime.UtcNow.Year);

            if (leaveBalance != null)
            {
                leaveBalance.UsedDays += leave.NumberOfDays;
                _context.LeaveBalances.Update(leaveBalance);
            }
        }

        _context.LeaveRequests.Update(leave);
        await _context.SaveChangesAsync();

        leave = await _context.LeaveRequests.Include(l => l.Employee).ThenInclude(e => e!.User).FirstAsync(l => l.Id == id);
        await _notificationService.SendLeaveStatusEmailAsync(leave);
        return _mapper.Map<LeaveRequestDto>(leave);
    }

    public async Task<bool> CancelAsync(Guid id)
    {
        var leave = await _context.LeaveRequests.FirstOrDefaultAsync(l => l.Id == id);
        if (leave == null || leave.Status == LeaveStatus.Cancelled) return false;

        leave.Status = LeaveStatus.Cancelled;
        leave.UpdatedAt = DateTime.UtcNow;

        _context.LeaveRequests.Update(leave);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<LeaveBalanceDto>> GetLeaveBalancesAsync(Guid employeeId)
    {
        var balances = await _context.LeaveBalances.Where(lb => lb.EmployeeId == employeeId && lb.Year == DateTime.UtcNow.Year).ToListAsync();
        return _mapper.Map<List<LeaveBalanceDto>>(balances);
    }

    public async Task<LeaveAnalyticsDto> GetAnalyticsAsync()
    {
        var currentYear = DateTime.UtcNow.Year;
        var leaveRequests = await _context.LeaveRequests
            .Where(l => l.StartDate.Year == currentYear || l.CreatedAt.Year == currentYear)
            .ToListAsync();

        var balances = await _context.LeaveBalances
            .Where(lb => lb.Year == currentYear)
            .ToListAsync();

        var byLeaveType = balances
            .GroupBy(b => b.LeaveType)
            .Select(g =>
            {
                var totalAllocated = g.Sum(x => x.TotalDays);
                var used = g.Sum(x => x.UsedDays);
                var remaining = g.Sum(x => x.RemainingDays);
                return new LeaveTypeAnalyticsDto
                {
                    LeaveType = g.Key.ToString(),
                    TotalAllocatedDays = totalAllocated,
                    UsedDays = used,
                    RemainingDays = remaining,
                    UtilizationPercentage = totalAllocated == 0 ? 0 : Math.Round((decimal)used * 100 / totalAllocated, 2)
                };
            })
            .OrderBy(x => x.LeaveType)
            .ToList();

        return new LeaveAnalyticsDto
        {
            TotalRequests = leaveRequests.Count,
            PendingRequests = leaveRequests.Count(l => l.Status == LeaveStatus.Pending),
            ManagerApprovedRequests = 0,
            ApprovedRequests = leaveRequests.Count(l => l.Status == LeaveStatus.Approved || l.Status == LeaveStatus.ManagerApproved),
            RejectedRequests = leaveRequests.Count(l => l.Status == LeaveStatus.Rejected),
            CancelledRequests = leaveRequests.Count(l => l.Status == LeaveStatus.Cancelled),
            ByLeaveType = byLeaveType
        };
    }

    public async Task<CarryForwardResultDto> ApplyCarryForwardAsync(int fromYear, int toYear, int maxCarryForwardDays = 5)
    {
        if (fromYear >= toYear)
        {
            throw new ArgumentException("fromYear must be less than toYear.");
        }

        var previousYearBalances = await _context.LeaveBalances
            .Where(lb => lb.Year == fromYear)
            .ToListAsync();

        var updated = 0;
        foreach (var previous in previousYearBalances)
        {
            var carryDays = Math.Min(Math.Max(previous.RemainingDays, 0), maxCarryForwardDays);
            var target = await _context.LeaveBalances.FirstOrDefaultAsync(lb =>
                lb.EmployeeId == previous.EmployeeId &&
                lb.LeaveType == previous.LeaveType &&
                lb.Year == toYear);

            var expectedTotalDays = 20 + carryDays;
            if (target == null)
            {
                target = new LeaveBalance
                {
                    EmployeeId = previous.EmployeeId,
                    LeaveType = previous.LeaveType,
                    TotalDays = expectedTotalDays,
                    UsedDays = 0,
                    Year = toYear,
                    CreatedAt = DateTime.UtcNow
                };
                _context.LeaveBalances.Add(target);
                updated++;
                continue;
            }

            if (target.TotalDays < expectedTotalDays)
            {
                target.TotalDays = expectedTotalDays;
                target.UpdatedAt = DateTime.UtcNow;
                _context.LeaveBalances.Update(target);
                updated++;
            }
        }

        await _context.SaveChangesAsync();

        return new CarryForwardResultDto
        {
            UpdatedBalances = updated,
            FromYear = fromYear,
            ToYear = toYear,
            MaxCarryForwardDays = maxCarryForwardDays
        };
    }
}
