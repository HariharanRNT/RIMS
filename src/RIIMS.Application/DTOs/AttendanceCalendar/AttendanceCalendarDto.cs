using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class AttendanceCalendarDto
{
    public int Id { get; set; }
    public DateOnly CalendarDate { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public AttendanceDayType DayType { get; set; }
    public string DayTypeName => DayType.ToString();
    public bool IsWorkingDay { get; set; }
    public bool IsHoliday { get; set; }
    public string? HolidayName { get; set; }
    public string? Description { get; set; }
    public bool IsPublished { get; set; }
    public int? PublishedBy { get; set; }
    public DateTime? PublishedAt { get; set; }
    public int? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }
    public bool LoginRequired => DayType == AttendanceDayType.WorkingDay || DayType == AttendanceDayType.SpecialWorkingDay;
}
