using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class AttendanceLog : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateTime LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }

    public bool IsLate { get; set; }
    public bool IsPermission { get; set; }
    public decimal PermissionHours { get; set; }
    public string Status { get; set; } = "Normal";

    // Navigation
    public Employee Employee { get; set; } = null!;
}
