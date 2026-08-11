namespace RIIMS.Application.DTOs.Task;

public class StartTaskRequest
{
    public int ProductId { get; set; }
    public int ClientId { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class TaskDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? Duration { get; set; }
}

public class ActiveTaskDto
{
    public int TaskId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? StartTime { get; set; }
    public int AccumulatedSeconds { get; set; }
}
