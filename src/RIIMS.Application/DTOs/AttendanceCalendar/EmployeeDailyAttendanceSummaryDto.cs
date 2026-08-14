using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class EmployeeDailyAttendanceSummaryDto
{
    public DateOnly Date { get; set; }
    public AttendanceDayType DayType { get; set; }
    public string DayTypeName => DayType.ToString();
    public bool IsWorkingDay { get; set; }
    public string? HolidayName { get; set; }
    public string Status { get; set; } = "Weekend"; // Present, Absent, Leave, Holiday, Weekend, HalfDay, Late
    public DateTime? LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public bool IsLate { get; set; }
    public bool IsPermission { get; set; }
    public decimal PermissionHours { get; set; }
    public bool IsLeave { get; set; }
    public bool IsSandwichLeave { get; set; }
    public bool IsLop { get; set; }
    public string? LopReason { get; set; }
    public string? LeaveReason { get; set; }
}
