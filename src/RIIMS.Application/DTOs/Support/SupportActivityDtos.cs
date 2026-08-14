namespace RIIMS.Application.DTOs.Support;

public class StartSupportRequest
{
    public int ActivityTypeId { get; set; }
}

public class StopSupportRequest
{
    public string Remarks { get; set; } = string.Empty;
    public int? ProductId { get; set; }
    public string? CustomProductName { get; set; }
    public int? ClientId { get; set; }
    public string? CustomClientName { get; set; }
}

public class CompleteDemoRequest
{
    public int SupportLogId { get; set; }
    public int? ProductId { get; set; }
    public string? CustomProductName { get; set; }
    public int? ClientId { get; set; }
    public string? CustomClientName { get; set; }
    public string ReviewRemarks { get; set; } = string.Empty;
    public DateTime FollowUpDate { get; set; }
}

public class DemoFollowUpDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public int SupportActivityLogId { get; set; }
    public int? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int? ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ReviewRemarks { get; set; } = string.Empty;
    public DateTime FollowUpDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? ReminderSentAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SupportLogDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int ActivityTypeId { get; set; }
    public string ActivityTypeName { get; set; } = string.Empty;
    public int? HeldTaskId { get; set; }
    public int? ProductId { get; set; }
    public string? ProductName { get; set; }
    public int? ClientId { get; set; }
    public string? ClientCompanyName { get; set; }
    public string? Remarks { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Duration { get; set; }
}
