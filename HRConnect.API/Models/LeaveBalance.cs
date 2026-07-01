namespace HRConnect.API.Models;

public class LeaveBalance
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeId { get; set; }
    public LeaveType LeaveType { get; set; }
    public int TotalDays { get; set; }
    public int UsedDays { get; set; }
    public int Year { get; set; } = DateTime.UtcNow.Year;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public virtual Employee? Employee { get; set; }

    public int RemainingDays => TotalDays - UsedDays;
}
