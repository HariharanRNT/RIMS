namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class MonthCalendarStatusDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string Status { get; set; } = "NotGenerated"; // NotGenerated, Draft, Published
    public bool IsGenerated { get; set; }
    public bool IsPublished { get; set; }
    public int TotalDays { get; set; }
    public int WorkingDays { get; set; }
    public int WeekendDays { get; set; }
    public int CompanyHolidays { get; set; }
    public int OptionalHolidays { get; set; }
    public int SpecialWorkingDays { get; set; }
    public int? PublishedBy { get; set; }
    public string? PublishedByName { get; set; }
    public DateTime? PublishedAt { get; set; }
}
