using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class IdleTimeLog : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateOnly WorkDate { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public int DurationMinutes { get; set; }
    public string Type { get; set; } = "LogoutLoginGap";

    // Navigation
    public Employee Employee { get; set; } = null!;
}
