using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

/// <summary>
/// Shared audit table written to by Task/Break/Support modules.
/// Uses polymorphic reference (RefTable + RefId) to link back to the source record.
/// </summary>
public class ActivityTimeline : BaseEntity
{
    public int EmployeeId { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string RefTable { get; set; } = string.Empty;
    public int RefId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
