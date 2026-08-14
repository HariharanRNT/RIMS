using RIIMS.Application.DTOs.Attendance;
using RIIMS.Application.DTOs.Break;
using RIIMS.Application.DTOs.Support;
using RIIMS.Application.DTOs.Task;

namespace RIIMS.Application.DTOs.Session;

public class SessionStatusDto
{
    public Guid SessionId { get; set; }
    public bool IsActive { get; set; }
    public string WorkDate { get; set; } = string.Empty;
    public DateTime LastSeenAt { get; set; }
}

public class CurrentServerStateDto
{
    public AttendanceDto? Attendance { get; set; }
    public ActiveTaskDto? ActiveTask { get; set; }
    public BreakLogDto? ActiveBreak { get; set; }
    public SupportLogDto? ActiveSupport { get; set; }
}
