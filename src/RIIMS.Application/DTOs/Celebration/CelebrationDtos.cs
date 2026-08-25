using System;

namespace RIIMS.Application.DTOs.Celebration;

public class CelebrationFeedDto
{
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty; // Birthday, CompanyAnniversary, MarriageAnniversary
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime EventDate { get; set; }
    public string DesignationName { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int? YearsOfService { get; set; }
    public bool IsToday { get; set; }
}

public class CelebrationTriggerResultDto
{
    public bool Success { get; set; }
    public int ProcessedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
