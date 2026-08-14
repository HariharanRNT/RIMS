using RIIMS.Application.DTOs.Task;
using RIIMS.Application.DTOs.Timeline;

namespace RIIMS.Application.DTOs.Report;

public class AdminDashboardMetricsDto
{
    public int TotalEmployees { get; set; }
    public int ActiveWorkforceCount { get; set; }
    public int WorkingCount { get; set; }
    public int OnBreakCount { get; set; }
    public int InSupportCount { get; set; }
    public int OfflineCount { get; set; }
    public double TodayProductiveHours { get; set; }
    public int TodayGraceViolations { get; set; }
    public List<ActivityTimelineDto> RecentActivities { get; set; } = new();
}

public class EmployeeDashboardMetricsDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateTime? TodayLoginTime { get; set; }
    public DateTime? TodayLogoutTime { get; set; }
    public double TodayProductiveHours { get; set; }
    public double TodayBreakHours { get; set; }
    public double TodayIdleHours { get; set; }
    public double TodayNonProductiveHours { get; set; }
    public int TodayActivitiesCount { get; set; }
    public bool HasGraceViolationToday { get; set; }
    public int MinutesLateToday { get; set; }
    public ActiveTaskDto? ActiveTask { get; set; }
    public List<ActivityTimelineDto> TodayActivities { get; set; } = new();
}

public class MonthlyProductionItemDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int DaysPresent { get; set; }
    public double ProductiveHours { get; set; }
    public double BreakHours { get; set; }
    public double IdleHours { get; set; }
    public double NonProductiveHours { get; set; }
    public int TasksCompleted { get; set; }
    public int GraceViolations { get; set; }
}

public class ProductWorkDistributionDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public double TotalHours { get; set; }
}

public class ClientWorkDistributionDto
{
    public int ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public double TotalHours { get; set; }
}

public class WorkDistributionReportDto
{
    public List<ProductWorkDistributionDto> Products { get; set; } = new();
    public List<ClientWorkDistributionDto> Clients { get; set; } = new();
}

public class DailyProductionItemDto
{
    public int EmployeeId { get; set; }
    public int? AttendanceLogId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime? LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public string Status { get; set; } = "Offline";
    public double ProductiveHours { get; set; }
    public double BreakHours { get; set; }
    public double IdleHours { get; set; }
    public double NonProductiveHours { get; set; }
    public int TasksCompleted { get; set; }
    public int MinutesLate { get; set; }

    public bool IsLate { get; set; }
    public bool IsPermission { get; set; }
    public decimal PermissionHours { get; set; }
    public string OfficeStartTime { get; set; } = "10:00 AM";
    public string GraceEndTime { get; set; } = "10:15 AM";
    public int LateCount { get; set; }
    public int PermissionCount { get; set; }
    public decimal LopDays { get; set; }
}

public class DailyTaskSessionDto
{
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string Duration { get; set; } = string.Empty;
}

public class DailyTaskDetailDto
{
    public int TaskId { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<DailyTaskSessionDto> Sessions { get; set; } = new();
    public double TotalTaskHours { get; set; }
}

public class DailyBreakDetailDto
{
    public string BreakTypeName { get; set; } = string.Empty;
    public string? HeldTaskModule { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string Duration { get; set; } = string.Empty;
}

public class DailySupportDetailDto
{
    public string ActivityTypeName { get; set; } = string.Empty;
    public string? ProductName { get; set; }
    public string? ClientName { get; set; }
    public string? Remarks { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string Duration { get; set; } = string.Empty;
}

public class DailyIdleDetailDto
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Duration { get; set; } = string.Empty;
    public string Type { get; set; } = "LogoutLoginGap";
}

public class EmployeeDailyDetailDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public double ProductiveHours { get; set; }
    public double BreakHours { get; set; }
    public double IdleHours { get; set; }
    public double NonProductiveHours { get; set; }
    public int MinutesLate { get; set; }
    public List<DailyTaskDetailDto> Tasks { get; set; } = new();
    public List<DailyBreakDetailDto> Breaks { get; set; } = new();
    public List<DailySupportDetailDto> SupportActivities { get; set; } = new();
    public List<DailyIdleDetailDto> Idles { get; set; } = new();
    public List<ActivityTimelineDto> Timeline { get; set; } = new();
}

public class AdminNotificationItemDto
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty; // "LateLogin", "LeaveRequest", "PermissionRequest"
    public string EmployeeName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string TargetUrl { get; set; } = string.Empty;
}

public class AdminNotificationSummaryDto
{
    public int TotalCount { get; set; }
    public int LateLoginCount { get; set; }
    public int LeaveRequestCount { get; set; }
    public int PermissionRequestCount { get; set; }
    public List<AdminNotificationItemDto> Notifications { get; set; } = new();
}

