using RIIMS.Application.DTOs.Settings;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;

namespace RIIMS.Infrastructure.Services;

public class AttendanceRuleEvaluationResult
{
    public DateOnly Date { get; set; }
    public AttendanceDayType DayType { get; set; }
    public bool IsWorkingDay { get; set; }
    public bool IsWeekendOrHoliday { get; set; }
    public bool IsFullDayLeave { get; set; }
    public bool IsHalfDayLeave { get; set; }
    public HalfDayType? HalfDayType { get; set; }
    public decimal LeaveDaysCount { get; set; }
    public TimeSpan ExpectedLoginTime { get; set; }
    public TimeSpan GraceEndTime { get; set; }
    public TimeSpan PermissionEndTime { get; set; }
    public DateTime? FirstLoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public bool IsOnTime { get; set; }
    public bool IsPermissionUsed { get; set; }
    public bool IsLateLogin { get; set; }
    public bool IsHalfDayAttendance { get; set; }
    public decimal PresentDaysCount { get; set; }
    public decimal AbsentLopDaysCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? LeaveReason { get; set; }
    public string? HolidayName { get; set; }
}

public static class AttendanceRuleEvaluator
{
    private static readonly TimeZoneInfo IstTimeZone = GetIstTimeZone();

    private static TimeZoneInfo GetIstTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
        }
        catch
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Indian Standard Time");
            }
            catch
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
            }
        }
    }

    public static AttendanceRuleEvaluationResult EvaluateDay(
        DateOnly date,
        DateTime? firstLoginTime,
        DateTime? logoutTime,
        LeaveRequest? approvedLeave,
        PermissionRequest? approvedPermission,
        AttendanceCalendar? calendarEntry,
        TypedSystemSettingsDto settings,
        bool isAttendanceMarkedPermission = false,
        bool isAttendanceMarkedLate = false)
    {
        DateTime dateDt = date.ToDateTime(TimeOnly.MinValue);
        AttendanceDayType dayType;
        bool isWorkingDay;
        string? holidayName = null;

        if (calendarEntry != null)
        {
            dayType = calendarEntry.DayType;
            isWorkingDay = calendarEntry.IsWorkingDay;
            holidayName = calendarEntry.HolidayName;
        }
        else
        {
            DayOfWeek dow = dateDt.DayOfWeek;
            bool isWeekend = dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;
            dayType = isWeekend ? AttendanceDayType.Weekend : AttendanceDayType.WorkingDay;
            isWorkingDay = !isWeekend;
        }

        var result = new AttendanceRuleEvaluationResult
        {
            Date = date,
            DayType = dayType,
            IsWorkingDay = isWorkingDay,
            FirstLoginTime = firstLoginTime,
            LogoutTime = logoutTime,
            HolidayName = holidayName
        };

        // 1. Weekend / Holiday Priority
        if (!isWorkingDay || dayType == AttendanceDayType.Weekend || dayType == AttendanceDayType.CompanyHoliday)
        {
            result.IsWeekendOrHoliday = true;
            result.Status = dayType == AttendanceDayType.CompanyHoliday ? "Holiday" : "Weekend";
            result.PresentDaysCount = firstLoginTime.HasValue ? 1.0m : 0.0m;
            return result;
        }

        // 2. Approved Full-Day Leave Priority
        if (approvedLeave != null && approvedLeave.LeaveDuration == LeaveDuration.FullDay)
        {
            result.IsFullDayLeave = true;
            result.LeaveDaysCount = 1.0m;
            result.PresentDaysCount = 0.0m;
            result.Status = "Leave";
            result.LeaveReason = approvedLeave.Reason;
            return result;
        }

        // 3. Approved Half-Day Leave Priority
        if (approvedLeave != null && approvedLeave.LeaveDuration == LeaveDuration.HalfDay)
        {
            result.IsHalfDayLeave = true;
            result.HalfDayType = approvedLeave.HalfDayType ?? HalfDayType.FirstHalf;
            result.LeaveDaysCount = 0.5m;
            result.LeaveReason = approvedLeave.Reason;
        }

        // 4 & 5. First Login & Expected Login Time
        if (!firstLoginTime.HasValue)
        {
            if (result.IsHalfDayLeave)
            {
                result.Status = result.HalfDayType == HalfDayType.FirstHalf ? "First Half Leave (No Second Half Login)" : "Second Half Leave (No First Half Login)";
                result.PresentDaysCount = 0.0m;
                result.AbsentLopDaysCount = 0.5m;
            }
            else
            {
                result.Status = "Absent";
                result.PresentDaysCount = 0.0m;
                result.AbsentLopDaysCount = 1.0m;
            }
            return result;
        }

        // Determine Expected Login Time
        if (result.IsHalfDayLeave && result.HalfDayType == HalfDayType.FirstHalf)
        {
            result.ExpectedLoginTime = settings.SecondHalfStartTime;
        }
        else
        {
            result.ExpectedLoginTime = settings.OfficeStartTime;
        }

        result.GraceEndTime = result.ExpectedLoginTime.Add(TimeSpan.FromMinutes(settings.GraceMinutes));
        result.PermissionEndTime = result.ExpectedLoginTime.Add(TimeSpan.FromHours((double)settings.PermissionHours));

        DateTime loginTimeIst = TimeZoneInfo.ConvertTimeFromUtc(firstLoginTime.Value, IstTimeZone);
        TimeSpan loginTimeOfDay = loginTimeIst.TimeOfDay;

        bool hasPermissionCoverage = isAttendanceMarkedPermission || approvedPermission != null;

        // 6. Grace Period Check
        if (loginTimeOfDay <= result.GraceEndTime && !isAttendanceMarkedLate)
        {
            result.IsOnTime = true;
            result.IsLateLogin = false;
            result.IsPermissionUsed = false;
            result.PresentDaysCount = result.IsHalfDayLeave ? 0.5m : 1.0m;
            result.Status = result.IsHalfDayLeave
                ? (result.HalfDayType == HalfDayType.FirstHalf ? "Second Half Present" : "First Half Present")
                : "Present";
            return result;
        }

        // 7 & 8. Permission & Late Login Evaluation (between GraceEndTime and PermissionEndTime)
        if (loginTimeOfDay <= result.PermissionEndTime)
        {
            result.IsLateLogin = true;
            if (hasPermissionCoverage)
            {
                result.IsPermissionUsed = true;
                result.Status = "Permission";
            }
            else
            {
                result.IsPermissionUsed = false;
                result.Status = "Late";
            }
            result.PresentDaysCount = result.IsHalfDayLeave ? 0.5m : 1.0m;
            return result;
        }

        // 9. Half-Day / Exceeds Permission Cutoff Rule (> PermissionEndTime)
        if (hasPermissionCoverage)
        {
            // Admin marked permission or approved permission request covers this late arrival
            result.IsLateLogin = true;
            result.IsPermissionUsed = true;
            result.Status = "Permission";
            result.PresentDaysCount = result.IsHalfDayLeave ? 0.5m : 1.0m;
            return result;
        }

        if (result.IsHalfDayLeave && result.HalfDayType == HalfDayType.FirstHalf)
        {
            result.IsLateLogin = true;
            result.Status = "Second Half Late";
            result.PresentDaysCount = 0.5m;
        }
        else if (result.IsHalfDayLeave && result.HalfDayType == HalfDayType.SecondHalf)
        {
            result.IsLateLogin = true;
            result.Status = "First Half Late";
            result.PresentDaysCount = 0.5m;
        }
        else
        {
            // No Approved First-Half Leave, logged in after permission cutoff without permission -> Half Day Attendance (0.5 leave), NOT Late Count
            result.IsHalfDayAttendance = true;
            result.IsLateLogin = false;
            result.PresentDaysCount = 0.5m;
            result.AbsentLopDaysCount = 0.5m;
            result.Status = "HalfDay Attendance";
        }

        return result;
    }
}
