namespace RIIMS.Application.DTOs.Break;

public class StartBreakRequest
{
    public int BreakTypeId { get; set; }
}

public class BreakLogDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public int BreakTypeId { get; set; }
    public string BreakTypeName { get; set; } = string.Empty;
    public int? HeldTaskId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string? Duration { get; set; }
}
