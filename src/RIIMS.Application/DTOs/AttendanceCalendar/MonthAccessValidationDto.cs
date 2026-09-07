namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class MonthAccessValidationDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public bool IsMonthEnded { get; set; }
    public int NextYear { get; set; }
    public int NextMonth { get; set; }
    public string NextMonthName { get; set; } = string.Empty;
    public bool IsNextMonthPublished { get; set; }
    public bool CanProcessPayroll { get; set; }
    public bool CanGenerateReport { get; set; }
    public string? ReasonMessage { get; set; }
}
