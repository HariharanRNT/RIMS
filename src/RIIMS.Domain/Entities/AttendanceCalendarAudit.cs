using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;

namespace RIIMS.Domain.Entities;

public class AttendanceCalendarAudit : BaseEntity
{
    public int AttendanceCalendarId { get; set; }
    public DateOnly CalendarDate { get; set; }
    public AttendanceDayType OldDayType { get; set; }
    public AttendanceDayType NewDayType { get; set; }
    public string? OldHolidayName { get; set; }
    public string? NewHolidayName { get; set; }
    public int ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public string ReasonForChange { get; set; } = string.Empty;

    // Navigation
    public AttendanceCalendar AttendanceCalendar { get; set; } = null!;
}
