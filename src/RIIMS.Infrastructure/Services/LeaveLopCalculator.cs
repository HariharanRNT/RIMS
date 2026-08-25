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

            bool isLate = (eval.IsLateLogin || isAttendanceMarkedLate) && !eval.IsHalfDayAttendance;
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
                IsLeave = eval.IsFullDayLeave || eval.IsHalfDayLeave || eval.IsHalfDayAttendance,
                IsHalfDayAttendance = eval.IsHalfDayAttendance,
                LeaveDaysCount = dayLeaveCount,
                PresentDaysCount = eval.PresentDaysCount,
                IsSandwichLeave = false,
                IsLop = false,
                Status = eval.Status,
                LeaveReason = eval.LeaveReason,
                HolidayName = eval.HolidayName
            });
        }

        // 2. Sandwich Leave Detection Engine
        Func<DateOnly, bool> isWorkingDayLeave = (d) =>
        {
            var detail = dailyDetails.FirstOrDefault(x => x.Date == d);
            if (detail != null) return detail.IsWorkingDay && detail.IsLeave;
            DayOfWeek dow = d.ToDateTime(TimeOnly.MinValue).DayOfWeek;
            bool defaultWorking = dow != DayOfWeek.Saturday && dow != DayOfWeek.Sunday;
            return defaultWorking && getApprovedLeave(d) != null;
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

                bool prevIsLeave = prevWorkingDate.HasValue && isWorkingDayLeave(prevWorkingDate.Value);
                bool nextIsLeave = nextWorkingDate.HasValue && isWorkingDayLeave(nextWorkingDate.Value);

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
        decimal totalLeaveDaysTaken = actualLeaveDays + sandwichLeaveDays;

        decimal availableAllowedLeave = Math.Max(0m, monthlyAllowedLeave - totalLeaveDaysTaken);
        decimal rawLeaveLopDays = Math.Max(0m, totalLeaveDaysTaken - monthlyAllowedLeave);

        int totalLateCount = dailyDetails.Count(d => d.IsLate);
        int permissionCount = dailyDetails.Count(d => d.IsPermission);
        int lateWithPermissionCount = dailyDetails.Count(d => d.IsLate && d.IsPermission);
        int unpermissionedLateCount = Math.Max(0, totalLateCount - lateWithPermissionCount);

        int threshold = Math.Max(1, settings?.LateLoginsForHalfDay ?? lateLoginsForHalfDay);
        decimal rawLateLoginLopDays = Math.Floor((decimal)unpermissionedLateCount / threshold) * 0.5m;

        // Centralized Offset Rule: Available allowed leave absorbs Late Login LOP
        decimal allowedLeaveOffset = Math.Min(rawLateLoginLopDays, availableAllowedLeave);
        decimal lateLoginLopDays = Math.Max(0m, rawLateLoginLopDays - availableAllowedLeave);
        decimal leaveLopDays = rawLeaveLopDays;
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
                d.LopReason = leaveLopDays > 0 ? "Leave LOP" : "Covered by Allowed Leave";
            }
            else if (d.IsWorkingDay && !d.LoginTime.HasValue && d.Date.ToDateTime(TimeOnly.MinValue).Date < nowIst.Date)
            {
                d.IsLop = true;
                d.LopReason = "Absent / Unapproved Leave";
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

        return new LeaveLopResult
        {
            EmployeeId = employeeId,
            Year = year,
            Month = month,
            TotalCalendarDays = totalDays,
            WorkingDays = workingDaysCount,
            PresentDays = presentDaysTotal,
            ApprovedLeaveDays = actualLeaveDays,
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
