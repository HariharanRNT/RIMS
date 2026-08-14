namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class EmployeeMonthlyAttendanceReportDto
{
    public int EmployeeId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public int TotalCalendarDays { get; set; }
    public int WorkingDays { get; set; }
    public int PresentDays { get; set; }
    public int ApprovedLeaveDays { get; set; }
    public int WeekendDays { get; set; }
    public int HolidayDays { get; set; }
    public int MonthlyAllowedLeave { get; set; }
    public decimal ActualLeaveDays { get; set; }
    public decimal SandwichLeaveDays { get; set; }
    public decimal TotalLeaveLOPDays { get; set; }
    public decimal LeaveLOPDays { get; set; }
    public int UnpermissionedLateCount { get; set; }
    public decimal LateLoginLOPDays { get; set; }
    public decimal TotalLOPDays { get; set; }
    public decimal DailySalary { get; set; }
    public decimal TotalLOPAmount { get; set; }

    public List<EmployeeDailyAttendanceSummaryDto> DailySummaries { get; set; } = new();
}
