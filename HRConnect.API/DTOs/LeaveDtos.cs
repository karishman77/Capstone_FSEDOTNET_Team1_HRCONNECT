using System.ComponentModel.DataAnnotations;

namespace HRConnect.API.DTOs;

public class CreateLeaveRequestDto
{
    [Required(ErrorMessage = "Leave type is required.")]
    [RegularExpression("(?i)^(Sick|Casual|Personal|Earned|Unpaid)$", ErrorMessage = "Leave type must be one of: Sick, Casual, Personal, Earned, Unpaid.")]
    public string LeaveType { get; set; } = string.Empty;

    [Required(ErrorMessage = "Start date is required.")]
    public DateTime StartDate { get; set; }

    [Required(ErrorMessage = "End date is required.")]
    public DateTime EndDate { get; set; }

    [Required(ErrorMessage = "Reason is required.")]
    [StringLength(500, MinimumLength = 3, ErrorMessage = "Reason must be between 3 and 500 characters.")]
    public string Reason { get; set; } = string.Empty;
}

public class UpdateLeaveRequestStatusDto
{
    [Required(ErrorMessage = "Status is required.")]
    [RegularExpression("(?i)^(Approved|Rejected)$", ErrorMessage = "Status must be either Approved or Rejected.")]
    public string Status { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Admin comments cannot exceed 1000 characters.")]
    public string? AdminComments { get; set; }
}

public class LeaveRequestDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int NumberOfDays { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? AdminComments { get; set; }
    public EmployeeDto? Employee { get; set; }
}

public class LeaveBalanceDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public int TotalDays { get; set; }
    public int UsedDays { get; set; }
    public int RemainingDays { get; set; }
    public int Year { get; set; }
}

public class LeaveTypeAnalyticsDto
{
    public string LeaveType { get; set; } = string.Empty;
    public int TotalAllocatedDays { get; set; }
    public int UsedDays { get; set; }
    public int RemainingDays { get; set; }
    public decimal UtilizationPercentage { get; set; }
}

public class LeaveAnalyticsDto
{
    public int TotalRequests { get; set; }
    public int PendingRequests { get; set; }
    public int ManagerApprovedRequests { get; set; }
    public int ApprovedRequests { get; set; }
    public int RejectedRequests { get; set; }
    public int CancelledRequests { get; set; }
    public List<LeaveTypeAnalyticsDto> ByLeaveType { get; set; } = new();
}

public class CarryForwardResultDto
{
    public int UpdatedBalances { get; set; }
    public int FromYear { get; set; }
    public int ToYear { get; set; }
    public int MaxCarryForwardDays { get; set; }
}
