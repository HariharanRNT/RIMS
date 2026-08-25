namespace RIIMS.Application.DTOs.IdleTime;

public class EmployeeCurrentStateDto
{
    public string State { get; set; } = "LOGGED_OUT"; // IDLE, TASK, SUPPORT_ACTIVITY, BREAK, LOGGED_OUT
    public int? AttendanceSessionId { get; set; }
    public DateTime? IdleStartedAt { get; set; }
    public DateTime? ActivityStartedAt { get; set; }
    public int? ActiveTaskId { get; set; }
    public int? ActiveSupportId { get; set; }
    public int? ActiveBreakId { get; set; }
    public long TodayWorkSeconds { get; set; }
    public long TodayBreakSeconds { get; set; }
    public long TodayIdleSeconds { get; set; }
    public int TodayActivitiesCount { get; set; }
}
