using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Application.DTOs.Payroll;
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
            return TimeZoneInfo.FindSystemTimeZoneById("Indian Standard Time");
        }
        catch
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
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
        List<AttendanceLog> attendanceLogs)
    {
        int totalDays = DateTime.DaysInMonth(year, month);
        var dailyDetails = new List<DailyLopDetail>();

        // Ensure monthlyAllowedLeave is non-negative
        monthlyAllowedLeave = Math.Max(0, monthlyAllowedLeave);

        // Pre-parse logs by IST work date
        var logsByDate = attendanceLogs
            .Where(a => a.EmployeeId == employeeId)
            .GroupBy(a => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone)))
            .ToDictionary(g => g.Key, g => g.OrderBy(x => x.LoginTime).First());

        // Employee approved leave checker (filtered by employeeId and approved status)
        Func<DateOnly, LeaveRequest?> getApprovedLeave = (d) =>
        {
            DateTime dt = d.ToDateTime(TimeOnly.MinValue);
            return approvedLeaves.FirstOrDefault(l =>
                l.EmployeeId == employeeId &&
                l.Status == RequestStatus.Approved &&
                l.FromDate.Date <= dt.Date &&
                l.ToDate.Date >= dt.Date);
        };

        // 1. Initial Pass: Build daily info for days 1..totalDays
        for (int day = 1; day <= totalDays; day++)
        {
            var date = new DateOnly(year, month, day);
            DateTime dateDt = date.ToDateTime(TimeOnly.MinValue);
            var calendar = calendarEntries.FirstOrDefault(c => c.CalendarDate == date);

            AttendanceDayType dayType;
            bool isWorkingDay;
            string? holidayName = null;

            if (calendar != null)
            {
                dayType = calendar.DayType;
                isWorkingDay = calendar.IsWorkingDay;
                holidayName = calendar.HolidayName;
            }
            else
            {
                DayOfWeek dow = dateDt.DayOfWeek;
                bool isWeekend = dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;
                dayType = isWeekend ? AttendanceDayType.Weekend : AttendanceDayType.WorkingDay;
                isWorkingDay = !isWeekend;
            }

            var leaveReq = getApprovedLeave(date);
            bool isOptionalHolidayApproved = dayType == AttendanceDayType.OptionalHoliday &&
                                              leaveReq != null &&
                                              leaveReq.LeaveType != null &&
                                              leaveReq.LeaveType.Name.Contains("Optional");

            if (dayType == AttendanceDayType.OptionalHoliday)
            {
                isWorkingDay = !isOptionalHolidayApproved;
            }

            logsByDate.TryGetValue(date, out var dayLog);

            bool isLeaveOnWorkingDay = isWorkingDay && leaveReq != null;

            dailyDetails.Add(new DailyLopDetail
            {
                Date = date,
                DayType = dayType,
                IsWorkingDay = isWorkingDay,
                LoginTime = dayLog?.LoginTime,
                LogoutTime = dayLog?.LogoutTime,
                IsLate = dayLog?.IsLate ?? false,
                IsPermission = dayLog?.IsPermission ?? false,
                IsLeave = isLeaveOnWorkingDay || leaveReq != null,
                IsSandwichLeave = false,
                IsLop = false,
                LeaveReason = leaveReq?.Reason,
                HolidayName = holidayName
            });
        }

        // Helper to check if a working day has approved leave (checking target month or external date)
        Func<DateOnly, bool> isWorkingDayLeave = (d) =>
        {
            if (d.Year == year && d.Month == month)
            {
                var detail = dailyDetails.FirstOrDefault(x => x.Date == d);
                return detail != null && detail.IsWorkingDay && detail.IsLeave;
            }
            else
            {
                // External date lookup
                DayOfWeek dow = d.ToDateTime(TimeOnly.MinValue).DayOfWeek;
                bool defaultWorking = dow != DayOfWeek.Saturday && dow != DayOfWeek.Sunday;
                return defaultWorking && getApprovedLeave(d) != null;
            }
        };

        // Helper to check if a date is a working day
        Func<DateOnly, bool> checkIsWorkingDay = (d) =>
        {
            if (d.Year == year && d.Month == month)
            {
                var detail = dailyDetails.FirstOrDefault(x => x.Date == d);
                return detail?.IsWorkingDay ?? (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday);
            }
            else
            {
                return d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday;
            }
        };

        // 2. Sandwich Leave Detection Engine
        // Group contiguous non-working days in the month
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

                // Find preceding working day before blockStart
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

                // Find succeeding working day after blockEnd
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

                // Sandwich Rule: Apply ONLY if BOTH preceding AND succeeding working days were approved employee leave
                if (prevIsLeave && nextIsLeave)
                {
                    for (int b = blockStart; b <= blockEnd; b++)
                    {
                        dailyDetails[b].IsSandwichLeave = true;
                    }
                }
            }
            else
            {
                idx++;
            }
        }

        // 3. Calculate Totals
        decimal actualLeaveDays = dailyDetails.Count(d => d.IsWorkingDay && d.IsLeave);
        decimal sandwichLeaveDays = dailyDetails.Count(d => d.IsSandwichLeave);
        decimal totalLeaveLOPDays = actualLeaveDays + sandwichLeaveDays;

        decimal leaveLopDays = Math.Max(0m, totalLeaveLOPDays - monthlyAllowedLeave);

        // Count unpermissioned late logins
        int unpermissionedLateCount = dailyDetails.Count(d => d.IsLate && !d.IsPermission);
        int threshold = Math.Max(1, lateLoginsForHalfDay);
        decimal lateLoginLopDays = Math.Floor((decimal)unpermissionedLateCount / threshold) * 0.5m;

        decimal totalLopDays = leaveLopDays + lateLoginLopDays;

        // Money-safe salary calculations (Formula: Daily Salary = Monthly Salary / 31)
        decimal dailySalary = Math.Round(monthlySalary / 31m, 4);
        decimal leaveLopAmount = Math.Round(leaveLopDays * dailySalary, 2);
        decimal lateLoginLopAmount = Math.Round(lateLoginLopDays * dailySalary, 2);
        decimal totalLopAmount = Math.Round(totalLopDays * dailySalary, 2);
        decimal actualSalary = Math.Max(0m, monthlySalary - totalLopAmount);

        // 4. Finalize Daily Status & LOP flags
        DateTime nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);

        foreach (var d in dailyDetails)
        {
            if (d.LoginTime.HasValue)
            {
                d.Status = d.IsLate ? (d.IsPermission ? "Permission" : "Late") : "Present";
            }
            else if (d.DayType == AttendanceDayType.CompanyHoliday || (d.DayType == AttendanceDayType.OptionalHoliday && !d.IsWorkingDay))
            {
                d.Status = "Holiday";
            }
            else if (d.IsSandwichLeave)
            {
                d.Status = "Sandwich Leave";
                d.IsLop = leaveLopDays > 0;
                d.LopReason = leaveLopDays > 0 ? "Sandwich Leave LOP" : "Sandwich Leave";
            }
            else if (d.DayType == AttendanceDayType.Weekend)
            {
                d.Status = "Weekend";
            }
            else if (d.IsLeave)
            {
                d.Status = "Leave";
                d.IsLop = leaveLopDays > 0;
                d.LopReason = leaveLopDays > 0 ? "Leave LOP" : "Covered by Allowed Leave";
            }
            else if (d.IsWorkingDay)
            {
                if (d.Date.ToDateTime(TimeOnly.MinValue).Date < nowIst.Date)
                {
                    d.Status = "Absent";
                }
                else
                {
                    d.Status = "Pending";
                }
            }

            if (d.IsLate && !d.IsPermission)
            {
                d.LopReason = lateLoginLopDays > 0 ? "Unpermissioned Late Login LOP" : "Unpermissioned Late Login";
            }
        }

        int workingDaysCount = dailyDetails.Count(d => d.IsWorkingDay);
        int presentCount = dailyDetails.Count(d => d.LoginTime.HasValue);
        int approvedLeaveCount = (int)actualLeaveDays;
        int weekendCount = dailyDetails.Count(d => d.DayType == AttendanceDayType.Weekend);
        int holidayCount = dailyDetails.Count(d => d.DayType == AttendanceDayType.CompanyHoliday || d.DayType == AttendanceDayType.OptionalHoliday);

        return new LeaveLopResult
        {
            EmployeeId = employeeId,
            Year = year,
            Month = month,
            TotalCalendarDays = totalDays,
            WorkingDays = workingDaysCount,
            PresentDays = presentCount,
            ApprovedLeaveDays = approvedLeaveCount,
            WeekendDays = weekendCount,
            HolidayDays = holidayCount,
            MonthlyAllowedLeave = monthlyAllowedLeave,
            ActualLeaveDays = actualLeaveDays,
            SandwichLeaveDays = sandwichLeaveDays,
            TotalLeaveLOPDays = totalLeaveLOPDays,
            LeaveLOPDays = leaveLopDays,
            UnpermissionedLateCount = unpermissionedLateCount,
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
