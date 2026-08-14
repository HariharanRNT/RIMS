using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.AttendanceCalendar;

public class AttendanceCalendarAuditDto
{
    public int Id { get; set; }
    public int AttendanceCalendarId { get; set; }
    public DateOnly CalendarDate { get; set; }
    public AttendanceDayType OldDayType { get; set; }
    public string OldDayTypeName => OldDayType.ToString();
    public AttendanceDayType NewDayType { get; set; }
    public string NewDayTypeName => NewDayType.ToString();
    public string? OldHolidayName { get; set; }
    public string? NewHolidayName { get; set; }
    public int ChangedByUserId { get; set; }
    public string? ChangedByUserName { get; set; }
    public DateTime ChangedAt { get; set; }
    public string ReasonForChange { get; set; } = string.Empty;
}
