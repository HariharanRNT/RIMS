namespace RIIMS.Application.DTOs.Timeline;

public class ActivityTimelineDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string RefTable { get; set; } = string.Empty;
    public int RefId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public string? Duration { get; set; }
}
