using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.Payroll;

public class DailyLopDetail
{
    public DateOnly Date { get; set; }
    public AttendanceDayType DayType { get; set; }
    public string DayTypeName => DayType.ToString();
    public bool IsWorkingDay { get; set; }
    public string Status { get; set; } = string.Empty; // Present, Late, Absent, Leave, Weekend, Holiday, SandwichLeave
    public DateTime? LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public bool IsLate { get; set; }
    public bool IsPermission { get; set; }
    public bool IsLeave { get; set; }
    public bool IsSandwichLeave { get; set; }
    public bool IsLop { get; set; }
    public bool IsHalfDayAttendance { get; set; }
    public decimal LeaveDaysCount { get; set; }
    public decimal PresentDaysCount { get; set; }
    public string? LopReason { get; set; }
    public string? LeaveReason { get; set; }
    public string? HolidayName { get; set; }
}

public class LeaveLopResult
{
    public int EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalCalendarDays { get; set; }
    public int WorkingDays { get; set; }
    public decimal PresentDays { get; set; }
    public decimal ApprovedLeaveDays { get; set; }
    public int WeekendDays { get; set; }
    public int HolidayDays { get; set; }
    public int MonthlyAllowedLeave { get; set; }
    public decimal ActualLeaveDays { get; set; }
    public decimal SandwichLeaveDays { get; set; }
    public decimal TotalLeaveLOPDays { get; set; }
    public decimal LeaveLOPDays { get; set; }
    public int TotalLateCount { get; set; }
    public int PermissionCount { get; set; }
    public int UnpermissionedLateCount { get; set; }
    public decimal RawLateLoginLOPDays { get; set; }
    public decimal AllowedLeaveOffset { get; set; }
    public decimal LateLoginLOPDays { get; set; }
    public decimal TotalLOPDays { get; set; }
    public decimal MonthlySalary { get; set; }
    public decimal DailySalary { get; set; }
    public decimal LeaveLOPAmount { get; set; }
    public decimal LateLoginLOPAmount { get; set; }
    public decimal TotalLOPAmount { get; set; }
    public decimal ActualSalary { get; set; }

    public List<DailyLopDetail> DailyDetails { get; set; } = new();
}
