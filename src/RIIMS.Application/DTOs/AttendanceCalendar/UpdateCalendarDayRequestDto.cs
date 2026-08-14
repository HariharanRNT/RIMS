using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class UpdateCalendarDayRequestDto
{
    public int Id { get; set; }
    public AttendanceDayType DayType { get; set; }
    public string? HolidayName { get; set; }
    public string? Description { get; set; }
    public string? ReasonForChange { get; set; }
}
