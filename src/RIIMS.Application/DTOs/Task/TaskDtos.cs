using System;
using System.Collections.Generic;
using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.Task;

public class StartTaskRequest
{
    public int? ProductId { get; set; }
    public string? CustomProductName { get; set; }
    public int? ClientId { get; set; }
    public string? CustomClientName { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class AssignTaskRequest
{
    public int EmployeeId { get; set; } // Target employee to be assigned
    public int? ProductId { get; set; }
    public string? CustomProductName { get; set; }
    public int? ClientId { get; set; }
    public string? CustomClientName { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public DateTime? PlannedStart { get; set; }
    public DateTime? DueDate { get; set; }
    public int? PlannedDurationMinutes { get; set; }
    public string? Instructions { get; set; }
}

public class ReassignTaskRequest
{
    public int NewEmployeeId { get; set; }
    public string? Remarks { get; set; }
}

public class CancelTaskRequest
{
    public string? Remarks { get; set; }
}

public class TaskTimelineEventDto
{
    public int Id { get; set; }
    public int WorkTaskId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int PerformedByEmployeeId { get; set; }
    public string PerformedByName { get; set; } = string.Empty;
    public string PerformedByRole { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class TaskDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public int? ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    
    // Assignment fields
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public string PriorityName => Priority.ToString();
    public int? AssignedByEmployeeId { get; set; }
    public string? AssignedByName { get; set; }
    public TaskAssignerType AssignerType { get; set; } = TaskAssignerType.Employee;
    public string AssignerTypeName => AssignerType.ToString();
    public DateTime? PlannedStart { get; set; }
    public DateTime? DueDate { get; set; }
    public int? PlannedDurationMinutes { get; set; }
    public string? Instructions { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? Duration { get; set; } // Actual productive duration formatted
    public int TotalProductiveSeconds { get; set; }
    public bool IsOverdue { get; set; }

    public List<TaskTimelineEventDto> TimelineEvents { get; set; } = new();
}

public class ActiveTaskDto
{
    public int TaskId { get; set; }
    public int? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int? ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public int AccumulatedSeconds { get; set; }
}

public class TeamEmployeeDto
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
}
