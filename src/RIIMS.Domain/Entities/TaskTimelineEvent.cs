using System;
using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class TaskTimelineEvent : BaseEntity
{
    public int WorkTaskId { get; set; }
    public string EventType { get; set; } = string.Empty; // "Created", "Assigned", "Modified", "Started", "Held", "Resumed", "Completed", "Reassigned", "Cancelled"
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public int PerformedByEmployeeId { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public string PerformedByRole { get; set; } = string.Empty;
    public string? Remarks { get; set; }

    // Navigation
    public WorkTask WorkTask { get; set; } = null!;
    public Employee PerformedByEmployee { get; set; } = null!;
}
