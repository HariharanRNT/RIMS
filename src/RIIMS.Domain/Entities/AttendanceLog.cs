using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class AttendanceLog : BaseEntity
{
    public int EmployeeId { get; set; }

    /// <summary>
    /// IST calendar date of the login session. Used as the anchor for the
    /// unique filtered index UX_AttendanceLog_OpenPerDay to prevent duplicate
    /// open attendance records per employee per day (race condition guard).
    /// Populated by AttendanceService using the IST-converted LoginTime.
    /// </summary>
    public DateOnly WorkDate { get; set; }

    public DateTime LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }

    public bool IsLate { get; set; }
    public bool IsPermission { get; set; }
    public decimal PermissionHours { get; set; }
    public string Status { get; set; } = "Normal";
    public DateTime? AllowedEndTime { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
