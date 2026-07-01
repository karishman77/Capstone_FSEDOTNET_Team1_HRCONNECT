namespace HRConnect.API.Models;

public enum LeaveStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Cancelled = 3,
    ManagerApproved = 4
}

public enum LeaveType
{
    Sick,
    Casual,
    Personal,
    Earned,
    Unpaid
}

public class LeaveRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeId { get; set; }
    public LeaveType LeaveType { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
    public string Reason { get; set; } = string.Empty;
    public int NumberOfDays { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? AdminComments { get; set; }

    // Navigation
    public virtual Employee? Employee { get; set; }
}
