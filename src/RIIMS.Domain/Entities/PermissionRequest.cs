using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;

namespace RIIMS.Domain.Entities;

public class PermissionRequest : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateTime RequestDate { get; set; }
    public TimeSpan FromTime { get; set; }
    public TimeSpan ToTime { get; set; }
    public string Reason { get; set; } = string.Empty;
    public RequestStatus Status { get; set; } = RequestStatus.Pending;
    public int? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Employee? Approver { get; set; }
}
