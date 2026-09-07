using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;

namespace RIIMS.Infrastructure.Services;

public static class LeaveLopCalculator
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

    public static LeaveLopResult Calculate(
        int employeeId,
        int year,
        int month,
        int monthlyAllowedLeave,
        int lateLoginsForHalfDay,
        decimal monthlySalary,
        List<AttendanceCalendarDto> calendarEntries,
        List<LeaveRequest> approvedLeaves,
        List<AttendanceLog> attendanceLogs,
        List<PermissionRequest>? approvedPermissions = null,
        TypedSystemSettingsDto? settings = null)
    {
        int totalDays = DateTime.DaysInMonth(year, month);
        var dailyDetails = new List<DailyLopDetail>();

        monthlyAllowedLeave = Math.Max(0, monthlyAllowedLeave);
        approvedPermissions ??= new List<PermissionRequest>();
        settings ??= new TypedSystemSettingsDto
        {
            MonthlyAllowedLeave = monthlyAllowedLeave,
            LateLoginsForHalfDay = lateLoginsForHalfDay
        };

        // Group attendance logs by date (earliest login time)
        var logsByDate = attendanceLogs
            .Where(a => a.EmployeeId == employeeId)
            .GroupBy(a => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone)))
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.LoginTime).First());

        Func<DateOnly, LeaveRequest?> getApprovedLeave = (d) =>
        {
            DateTime dt = d.ToDateTime(TimeOnly.MinValue);
            return approvedLeaves.FirstOrDefault(l =>
                l.EmployeeId == employeeId &&
                l.Status == RequestStatus.Approved &&
                l.FromDate.Date <= dt.Date &&
                l.ToDate.Date >= dt.Date);
        };

        Func<DateOnly, PermissionRequest?> getApprovedPermission = (d) =>
        {
            DateTime dt = d.ToDateTime(TimeOnly.MinValue);
            return approvedPermissions.FirstOrDefault(p =>
                p.EmployeeId == employeeId &&
                p.Status == RequestStatus.Approved &&
                p.RequestDate.Date == dt.Date);
        };

        // 1. Evaluate Each Day using AttendanceRuleEvaluator (Pipeline steps 1 - 9)
        for (int day = 1; day <= totalDays; day++)
        {
            var date = new DateOnly(year, month, day);
            var calendar = calendarEntries.FirstOrDefault(c => c.CalendarDate == date);
            AttendanceCalendar? domainCal = null;
            if (calendar != null)
            {
                domainCal = new AttendanceCalendar
                {
                    CalendarDate = calendar.CalendarDate,
                    DayType = calendar.DayType,
                    IsWorkingDay = calendar.IsWorkingDay,
                    HolidayName = calendar.HolidayName
                };
            }

            var leaveReq = getApprovedLeave(date);
            var permReq = getApprovedPermission(date);
            logsByDate.TryGetValue(date, out var dayLog);

            bool isAttendanceMarkedPerm = dayLog != null && dayLog.IsPermission;
            bool isAttendanceMarkedLate = dayLog != null && dayLog.IsLate;

            var eval = AttendanceRuleEvaluator.EvaluateDay(
                date,
                dayLog?.LoginTime,
                dayLog?.LogoutTime,
                leaveReq,
                permReq,
                domainCal,
                settings,
                isAttendanceMarkedPerm,
                isAttendanceMarkedLate);

            bool isLate = (eval.IsLateLogin || (isAttendanceMarkedLate && !eval.IsOnTime)) && !eval.IsHalfDayAttendance;
            bool isPermission = eval.IsPermissionUsed || isAttendanceMarkedPerm || permReq != null;

            decimal dayLeaveCount = eval.LeaveDaysCount;
            if (eval.IsHalfDayAttendance && !eval.IsHalfDayLeave)
            {
                dayLeaveCount += 0.5m;
            }

            dailyDetails.Add(new DailyLopDetail
            {
                Date = date,
                DayType = eval.DayType,
                IsWorkingDay = eval.IsWorkingDay,
                LoginTime = eval.FirstLoginTime ?? dayLog?.LoginTime,
                LogoutTime = eval.LogoutTime ?? dayLog?.LogoutTime,
                IsLate = isLate,
                IsPermission = isPermission,
                IsLeave = eval.IsFullDayLeave || eval.IsHalfDayLeave || eval.IsHalfDayAttendance || dayLeaveCount > 0,
                IsHalfDayAttendance = eval.IsHalfDayAttendance,
                IsFullDayLeave = eval.IsFullDayLeave || (eval.Status == "Absent" && !eval.IsHalfDayAttendance),
                IsHalfDayLeave = eval.IsHalfDayLeave,
                HalfDayType = eval.HalfDayType,
                LeaveDaysCount = dayLeaveCount,
                PresentDaysCount = eval.PresentDaysCount,
                IsSandwichLeave = false,
                IsLop = false,
                Status = eval.Status,
                LeaveReason = eval.LeaveReason,
                HolidayName = eval.HolidayName
            });
        }

        // 2. Sandwich Leave Detection Engine (Connecting Preceding/Succeeding Workdays)
        // Rule: On Friday (preceding), only Full-Day Leave/Absent or Second-Half Leave connects into the weekend.
        // First-Half Leave / Login after 11:00 AM means employee was present during second half, so Sandwich Leave does NOT apply.
        Func<DateOnly, bool> isPrevConnectingLeave = (d) =>
        {
            var detail = dailyDetails.FirstOrDefault(x => x.Date == d);
            if (detail != null)
            {
                if (!detail.IsWorkingDay) return false;
                if (detail.IsFullDayLeave || (detail.Status == "Absent" && !detail.IsHalfDayAttendance))
                    return true;
                if (detail.IsHalfDayLeave && detail.HalfDayType == HalfDayType.SecondHalf)
                    return true;
                // First-half leave or Login after 11:00 AM (First-half absent) was PRESENT during 2nd half -> NO sandwich
                return false;
            }
            var appLeave = getApprovedLeave(d);
            if (appLeave == null) return false;
            if (appLeave.LeaveDuration == LeaveDuration.FullDay) return true;
            return appLeave.HalfDayType == HalfDayType.SecondHalf;
        };

        // Rule: On Monday (succeeding), Full-Day Leave/Absent, First-Half Leave, or Login after 11:00 AM connects from the weekend.
        Func<DateOnly, bool> isNextConnectingLeave = (d) =>
        {
            var detail = dailyDetails.FirstOrDefault(x => x.Date == d);
            if (detail != null)
            {
                if (!detail.IsWorkingDay) return false;
                if (detail.IsFullDayLeave || (detail.Status == "Absent" && !detail.IsHalfDayAttendance))
                    return true;
                if (detail.IsHalfDayLeave && detail.HalfDayType == HalfDayType.FirstHalf)
                    return true;
                if (detail.IsHalfDayAttendance)
                    return true;
                // Second-half leave (present in 1st half) -> NO sandwich
                return false;
            }
            var appLeave = getApprovedLeave(d);
            if (appLeave == null) return false;
            if (appLeave.LeaveDuration == LeaveDuration.FullDay) return true;
            return appLeave.HalfDayType == HalfDayType.FirstHalf;
        };

        Func<DateOnly, bool> checkIsWorkingDay = (d) =>
        {
            var detail = dailyDetails.FirstOrDefault(x => x.Date == d);
            if (detail != null) return detail.IsWorkingDay;
            DayOfWeek dow = d.ToDateTime(TimeOnly.MinValue).DayOfWeek;
            return dow != DayOfWeek.Saturday && dow != DayOfWeek.Sunday;
        };

        int idx = 0;
        while (idx < totalDays)
        {
            if (!dailyDetails[idx].IsWorkingDay)
            {
                int blockStart = idx;
                while (idx < totalDays && !dailyDetails[idx].IsWorkingDay)
                {
                    idx++;
                }
                int blockEnd = idx - 1;

                DateOnly? prevWorkingDate = null;
                DateOnly checkPrev = dailyDetails[blockStart].Date.AddDays(-1);
                for (int i = 0; i < 30; i++)
                {
                    if (checkIsWorkingDay(checkPrev))
                    {
                        prevWorkingDate = checkPrev;
                        break;
                    }
                    checkPrev = checkPrev.AddDays(-1);
                }

                DateOnly? nextWorkingDate = null;
                DateOnly checkNext = dailyDetails[blockEnd].Date.AddDays(1);
                for (int i = 0; i < 30; i++)
                {
                    if (checkIsWorkingDay(checkNext))
                    {
                        nextWorkingDate = checkNext;
                        break;
                    }
                    checkNext = checkNext.AddDays(1);
                }

                bool prevIsLeave = prevWorkingDate.HasValue && isPrevConnectingLeave(prevWorkingDate.Value);
                bool nextIsLeave = nextWorkingDate.HasValue && isNextConnectingLeave(nextWorkingDate.Value);

                if (prevIsLeave && nextIsLeave)
                {
                    for (int b = blockStart; b <= blockEnd; b++)
                    {
                        dailyDetails[b].IsSandwichLeave = true;
                        dailyDetails[b].LeaveDaysCount = 1.0m;
                    }
                }
            }
            else
            {
                idx++;
            }
        }

        // 3. Centralized LOP Calculation (Pipeline Step 10)
        decimal actualLeaveDays = dailyDetails.Where(d => d.IsWorkingDay).Sum(d => d.LeaveDaysCount);
        decimal sandwichLeaveDays = dailyDetails.Count(d => d.IsSandwichLeave);

        int totalLateCount = dailyDetails.Count(d => d.IsLate && !d.IsHalfDayAttendance);
        int permissionCount = dailyDetails.Count(d => d.IsPermission);
        int lateWithPermissionCount = dailyDetails.Count(d => d.IsLate && d.IsPermission && !d.IsHalfDayAttendance);
        int unpermissionedLateCount = Math.Max(0, totalLateCount - lateWithPermissionCount);

        int threshold = Math.Max(1, settings?.LateLoginsForHalfDay ?? lateLoginsForHalfDay);
        decimal rawLateLoginLopDays = Math.Floor((decimal)unpermissionedLateCount / threshold) * 0.5m;

        decimal totalLeaveDaysTaken = actualLeaveDays + sandwichLeaveDays + rawLateLoginLopDays;

        decimal leaveBaseDays = actualLeaveDays + sandwichLeaveDays;
        decimal availableAllowedLeave = Math.Max(0m, monthlyAllowedLeave - leaveBaseDays);
        decimal leaveLopDays = Math.Max(0m, leaveBaseDays - monthlyAllowedLeave);

        // Centralized Offset Rule: Available allowed leave absorbs Late Login LOP
        decimal allowedLeaveOffset = Math.Min(rawLateLoginLopDays, availableAllowedLeave);
        decimal lateLoginLopDays = Math.Max(0m, rawLateLoginLopDays - availableAllowedLeave);
        decimal totalLopDays = leaveLopDays + lateLoginLopDays;

        decimal dailySalary = Math.Round(monthlySalary / 31m, 4);
        decimal leaveLopAmount = Math.Round(leaveLopDays * dailySalary, 2);
        decimal lateLoginLopAmount = Math.Round(lateLoginLopDays * dailySalary, 2);
        decimal totalLopAmount = Math.Round(totalLopDays * dailySalary, 2);
        decimal actualSalary = Math.Max(0m, monthlySalary - totalLopAmount);

        // 4. Finalize Daily LOP Flags
        DateTime nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);

        foreach (var d in dailyDetails)
        {
            if (d.IsSandwichLeave)
            {
                d.Status = "Sandwich Leave";
                d.IsLop = leaveLopDays > 0;
                d.LopReason = leaveLopDays > 0 ? "Sandwich Leave LOP" : "Sandwich Leave";
            }
            else if (d.IsLeave)
            {
                d.IsLop = leaveLopDays > 0;
                d.LopReason = leaveLopDays > 0 
                    ? (d.Status.StartsWith("Absent") ? "Absent LOP" : "Leave LOP") 
                    : "Covered by Allowed Leave";
            }

            if (d.IsLate && !d.IsPermission)
            {
                d.LopReason = lateLoginLopDays > 0 ? "Unpermissioned Late Login LOP" : "Unpermissioned Late Login (Offset by Allowed Leave)";
            }
        }

        int workingDaysCount = dailyDetails.Count(d => d.IsWorkingDay);
        decimal presentDaysTotal = dailyDetails.Sum(d => d.PresentDaysCount);
        int weekendCount = dailyDetails.Count(d => d.DayType == AttendanceDayType.Weekend);
        int holidayCount = dailyDetails.Count(d => d.DayType == AttendanceDayType.CompanyHoliday || d.DayType == AttendanceDayType.OptionalHoliday);

        decimal approvedLeaveDays = dailyDetails.Where(d => d.IsWorkingDay && getApprovedLeave(d.Date) != null).Sum(d => getApprovedLeave(d.Date)!.LeaveDuration == LeaveDuration.HalfDay ? 0.5m : 1.0m);

        return new LeaveLopResult
        {
            EmployeeId = employeeId,
            Year = year,
            Month = month,
            TotalCalendarDays = totalDays,
            WorkingDays = workingDaysCount,
            PresentDays = presentDaysTotal,
            ApprovedLeaveDays = approvedLeaveDays,
            WeekendDays = weekendCount,
            HolidayDays = holidayCount,
            MonthlyAllowedLeave = monthlyAllowedLeave,
            ActualLeaveDays = actualLeaveDays,
            SandwichLeaveDays = sandwichLeaveDays,
            TotalLeaveLOPDays = totalLeaveDaysTaken,
            LeaveLOPDays = leaveLopDays,
            TotalLateCount = totalLateCount,
            PermissionCount = permissionCount,
            UnpermissionedLateCount = unpermissionedLateCount,
            RawLateLoginLOPDays = rawLateLoginLopDays,
            AllowedLeaveOffset = allowedLeaveOffset,
            LateLoginLOPDays = lateLoginLopDays,
            TotalLOPDays = totalLopDays,
            MonthlySalary = monthlySalary,
            DailySalary = dailySalary,
            LeaveLOPAmount = leaveLopAmount,
            LateLoginLOPAmount = lateLoginLopAmount,
            TotalLOPAmount = totalLopAmount,
            ActualSalary = actualSalary,
            DailyDetails = dailyDetails
        };
    }
}
