using System;
using System.Collections.Generic;
using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Domain.Entities;

/// <summary>
/// Named WorkTask to avoid conflict with System.Threading.Tasks.Task.
/// Maps to "Tasks" table in the database.
/// </summary>
public class WorkTask : BaseEntity
{
    public int EmployeeId { get; set; }
    public int? ProductId { get; set; }
    public string? CustomProductName { get; set; }
    public int? ClientId { get; set; }
    public string? CustomClientName { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TaskStatusEnum Status { get; set; } = TaskStatusEnum.Running;

    // Assignment & Scheduling
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public int? AssignedByEmployeeId { get; set; }
    public TaskAssignerType AssignerType { get; set; } = TaskAssignerType.Employee;
    public DateTime? PlannedStart { get; set; }
    public DateTime? DueDate { get; set; }
    public int? PlannedDurationMinutes { get; set; }
    public string? Instructions { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Employee? AssignedByEmployee { get; set; }
    public Product? Product { get; set; }
    public Client? Client { get; set; }
    public ICollection<TaskTimeLog> TimeLogs { get; set; } = new List<TaskTimeLog>();
    public ICollection<BreakLog> BreakLogs { get; set; } = new List<BreakLog>();
    public ICollection<SupportActivityLog> SupportActivityLogs { get; set; } = new List<SupportActivityLog>();
    public ICollection<TaskTimelineEvent> TimelineEvents { get; set; } = new List<TaskTimelineEvent>();
}
