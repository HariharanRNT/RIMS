namespace RIIMS.Application.DTOs.Attendance;

public class AttendanceDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public DateTime LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public string? Duration { get; set; }

    public bool IsLate { get; set; }
    public bool IsPermission { get; set; }
    public decimal PermissionHours { get; set; }
    public string Status { get; set; } = "Normal";

    public string OfficeStartTime { get; set; } = "10:00 AM";
    public string GraceEndTime { get; set; } = "10:15 AM";
    public DateTime? AllowedEndTime { get; set; }
    public string? AllowedEndTimeDisplay { get; set; }
    public int MonthlyLateCount { get; set; }
    public decimal MonthlyLopDays { get; set; }
}

public class PermissionSummaryDto
{
    public int EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal AllocatedHours { get; set; } = 1.0m;
    public decimal UsedHours { get; set; }
    public decimal RemainingHours { get; set; }
}
