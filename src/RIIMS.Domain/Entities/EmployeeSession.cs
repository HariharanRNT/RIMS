using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class EmployeeSession : BaseEntity
{
    public int EmployeeId { get; set; }
    public Guid SessionId { get; set; }
    public string TokenJti { get; set; } = string.Empty;
    public DateOnly WorkDate { get; set; }
    public DateTime LoginTime { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? LogoutTime { get; set; }
    public DateTime? AllowedEndTime { get; set; }
    public string? DeviceInfo { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
