using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Attendance;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class AttendanceService : IAttendanceService
{
    private readonly RiimsDbContext _context;
    private readonly ISystemSettingService _settingService;
    private readonly IIdleTimeService _idleTimeService;

    public AttendanceService(RiimsDbContext context, ISystemSettingService settingService, IIdleTimeService idleTimeService)
    {
        _context = context;
        _settingService = settingService;
        _idleTimeService = idleTimeService;
    }

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

    public async Task<AttendanceDto> LoginAsync(int employeeId)
    {
        var now = DateTime.UtcNow;
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(now, IstTimeZone);

        // ── IST WorkDate is the single source of truth for "today" ──────────
        // All date comparisons below use this value so midnight-IST edge cases
        // are handled consistently across the whole method.
        var workDate = DateOnly.FromDateTime(nowIst.Date);

        // ── LAYER 1: Close any previous unclosed attendance from a DIFFERENT
        //    day (previous-day open session from a missed logout).
        //    We intentionally do NOT close today's open record here — we check
        //    for it below and return it idempotently instead of creating a new one.
        var staleOpenAttendance = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId
                                   && a.LogoutTime == null
                                   && a.WorkDate < workDate);

        if (staleOpenAttendance != null)
        {
            // Auto-close yesterday's open record at its start time (zero duration)
            staleOpenAttendance.LogoutTime = staleOpenAttendance.LoginTime;
        }

        // ── LAYER 2: Application-level idempotency guard ─────────────────────
        // Check if an open record for TODAY's WorkDate already exists.
        // If so — the employee is already logged in (or a concurrent request
        // already created the record). Return the existing record immediately.
        var existingOpenToday = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId
                                   && a.LogoutTime == null
                                   && a.WorkDate == workDate);

        if (existingOpenToday != null)
        {
            // Save the stale-close if there was one, then return the existing record.
            if (staleOpenAttendance != null)
                await _context.SaveChangesAsync();

            var settings0 = await _settingService.GetTypedSettingsAsync();
            return await BuildAttendanceDtoAsync(existingOpenToday, settings0);
        }

        // Fetch strongly-typed system settings
        var settings = await _settingService.GetTypedSettingsAsync();

        var officeStart = settings.OfficeStartTime;
        var graceEnd = officeStart.Add(TimeSpan.FromMinutes(settings.GraceMinutes));
        var loginTimeOfDay = nowIst.TimeOfDay;

        // Check if an AttendanceLog for this employee already exists on today's WorkDate (in IST)
        // This is for the "Daily First Login Rule" — a same-day re-login after a voluntary logout.
        var existingTodayLog = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.WorkDate == workDate)
            .OrderBy(a => a.LoginTime)
            .FirstOrDefaultAsync();

        // Daily First Login Rule: Only the earliest valid login event of the day is evaluated for late login.
        // Subsequent login events after a logout on the same date are break returns / additional sessions and MUST NEVER be marked late.
        bool isLate;
        bool isPermission = false;
        string status;

        if (existingTodayLog != null)
        {
            isLate = false;
            status = "Subsequent Session";
        }
        else
        {
            var todayLeave = await _context.LeaveRequests
                .FirstOrDefaultAsync(l => l.EmployeeId == employeeId &&
                                          l.Status == RequestStatus.Approved &&
                                          l.FromDate.Date <= nowIst.Date &&
                                          l.ToDate.Date >= nowIst.Date);

            var todayPermission = await _context.PermissionRequests
                .FirstOrDefaultAsync(p => p.EmployeeId == employeeId &&
                                          p.Status == RequestStatus.Approved &&
                                          p.RequestDate.Date == workDate.ToDateTime(TimeOnly.MinValue));

            // Auto-Permission Offset (Blueprint §6 Rule 13 / Scenario 17):
            // If no pre-approved PermissionRequest exists for today, but login is late
            // (after graceEnd 10:15) and within the permission window (<= PermissionEndTime 11:00),
            // check if the employee has unused monthly permission budget available.
            var permissionEndTime = officeStart.Add(TimeSpan.FromHours((double)settings.PermissionHours));
            if (todayPermission == null && loginTimeOfDay > graceEnd && loginTimeOfDay <= permissionEndTime)
            {
                var monthStart = new DateTime(nowIst.Year, nowIst.Month, 1);
                var monthEnd = monthStart.AddMonths(1);

                var approvedPermsCount = await _context.PermissionRequests
                    .CountAsync(p => p.EmployeeId == employeeId &&
                                     p.Status == RequestStatus.Approved &&
                                     p.RequestDate >= monthStart && p.RequestDate < monthEnd);

                var monthStartDateOnly = DateOnly.FromDateTime(monthStart);
                var monthEndDateOnly = DateOnly.FromDateTime(monthEnd);

                var markedPermsCount = await _context.AttendanceLogs
                    .CountAsync(a => a.EmployeeId == employeeId &&
                                     a.IsPermission &&
                                     a.WorkDate >= monthStartDateOnly &&
                                     a.WorkDate < monthEndDateOnly);

                int permsUsed = Math.Max(approvedPermsCount, markedPermsCount);
                if (permsUsed < settings.MonthlyAllowedPermissions)
                {
                    isPermission = true;
                }
            }

            var calEntry = await _context.AttendanceCalendars
                .FirstOrDefaultAsync(c => c.CalendarDate == workDate);

            var eval = AttendanceRuleEvaluator.EvaluateDay(
                workDate,
                now,
                null,
                todayLeave,
                todayPermission,
                calEntry,
                settings,
                isAttendanceMarkedPermission: isPermission);

            isLate = eval.IsLateLogin;
            isPermission = eval.IsPermissionUsed;
            status = eval.Status;
        }

        DateTime allowedEndTimeUtc;

        if (existingTodayLog != null && existingTodayLog.AllowedEndTime.HasValue)
        {
            // Reuse single authoritative AllowedEndTime from the first login of the WorkDate
            allowedEndTimeUtc = existingTodayLog.AllowedEndTime.Value;
        }
        else
        {
            // First login of the WorkDate: Calculate authoritative AllowedEndTime in IST, then convert to UTC
            var officeEnd = settings.OfficeEndTime;
            DateTime todayOfficeEndIst = nowIst.Date.Add(officeEnd);
            DateTime allowedEndTimeIst;

            if (loginTimeOfDay <= officeStart)
            {
                // Rule 1: On or before OfficeStartTime (e.g. 10:00 AM) -> OfficeEndTime (7:00 PM)
                allowedEndTimeIst = todayOfficeEndIst;
            }
            else if (loginTimeOfDay <= graceEnd)
            {
                // Rule 2: Within Grace Period (10:01 AM - 10:15 AM) -> Extend by exact delay minutes (e.g. 10:14 AM -> 7:14 PM)
                TimeSpan delay = loginTimeOfDay - officeStart;
                allowedEndTimeIst = todayOfficeEndIst.Add(delay);
            }
            else
            {
                // Rule 3: Exceeds Grace Period (> 10:15 AM, e.g. 10:16 AM, 10:30 AM, 11:00 AM) -> OfficeEndTime (7:00 PM, No extension!)
                allowedEndTimeIst = todayOfficeEndIst;
            }

            // Important Rule: The system must NEVER automatically log out an employee before the configured OfficeEndTime
            if (allowedEndTimeIst < todayOfficeEndIst)
            {
                allowedEndTimeIst = todayOfficeEndIst;
            }

            allowedEndTimeUtc = TimeZoneInfo.ConvertTimeToUtc(allowedEndTimeIst, IstTimeZone);
        }

        var attendance = new AttendanceLog
        {
            EmployeeId = employeeId,
            WorkDate = workDate,   // ← IST date stored for unique-index filtering
            LoginTime = now,
            LogoutTime = null,
            IsLate = isLate,
            IsPermission = isPermission,
            PermissionHours = isPermission ? settings.PermissionHours : 0m,
            Status = status,
            AllowedEndTime = allowedEndTimeUtc
        };

        _context.AttendanceLogs.Add(attendance);

        // Synchronize calculated AllowedEndTime to any active EmployeeSessions for today
        var activeSessions = await _context.EmployeeSessions
            .Where(s => s.EmployeeId == employeeId && s.IsActive && s.WorkDate == workDate)
            .ToListAsync();

        foreach (var s in activeSessions)
        {
            s.AllowedEndTime = allowedEndTimeUtc;
        }

        // Start open idle record if no active task/support/break
        await _idleTimeService.OnPunchInAsync(employeeId, now);

        // Rule 13 / Scenario 17 Fix: Only record grace violation if late AND NOT covered by permission
        if (isLate && !isPermission)
        {
            await CheckAndRecordGraceViolationAsync(employeeId, now, (int)(loginTimeOfDay - officeStart).TotalMinutes);
        }

        // ── LAYER 3: DB-level race condition guard ─────────────────────────
        // The unique filtered index UX_AttendanceLog_OpenPerDay on
        // (EmployeeId, WorkDate) WHERE LogoutTime IS NULL ensures that even if
        // two requests both pass Layers 1 & 2 simultaneously, only one INSERT
        // will succeed at the database level.
        //
        // The loser gets a DbUpdateException (unique constraint violation).
        // We catch it, reload the winning record, and return it — the caller
        // gets a valid 200 response and no duplicate record is created.
        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
            when (ex.InnerException?.Message.Contains("UX_AttendanceLog_OpenPerDay") == true
               || ex.InnerException?.Message.Contains("unique constraint") == true
               || ex.InnerException?.Message.Contains("UNIQUE KEY") == true)
        {
            // Another concurrent request won the race — clear the tracked changes
            // and reload the already-saved record.
            _context.ChangeTracker.Clear();

            var winner = await _context.AttendanceLogs
                .FirstOrDefaultAsync(a => a.EmployeeId == employeeId
                                       && a.LogoutTime == null
                                       && a.WorkDate == workDate);

            if (winner != null)
                return await BuildAttendanceDtoAsync(winner, settings);

            // Fallback: re-throw if we can't find the winning record
            throw;
        }

        // Recalculate monthly LOP for employee
        await RecalculateMonthlyAttendanceLOPAsync(employeeId, nowIst.Year, nowIst.Month);

        return await BuildAttendanceDtoAsync(attendance, settings);
    }


    public async Task LogoutAsync(int employeeId)
    {
        var now = DateTime.UtcNow;

        var attendance = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.LogoutTime == null);

        if (attendance != null)
        {
            attendance.LogoutTime = now;
        }

        var activeSessions = await _context.EmployeeSessions
            .Where(s => s.EmployeeId == employeeId && s.IsActive)
            .ToListAsync();

        foreach (var s in activeSessions)
        {
            s.IsActive = false;
            s.LogoutTime = now;
        }

        var runningTasks = await _context.WorkTasks
            .Where(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running)
            .ToListAsync();

        foreach (var task in runningTasks)
        {
            task.Status = TaskStatusEnum.OnHold;

            var openTimeLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == task.Id && tl.EndTime == null);
            if (openTimeLog != null)
            {
                openTimeLog.EndTime = now;
            }

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = task.Id,
                StartTime = openTimeLog?.StartTime ?? now,
                EndTime = now,
                Status = "AutoHeld",
                Remarks = "Auto-held on logout"
            });
        }

        var activeBreaks = await _context.BreakLogs
            .Where(b => b.EmployeeId == employeeId && b.EndTime == null)
            .ToListAsync();

        foreach (var breakLog in activeBreaks)
        {
            breakLog.EndTime = now;

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Break",
                RefTable = "BreakLogs",
                RefId = breakLog.Id,
                StartTime = breakLog.StartTime,
                EndTime = now,
                Status = "AutoClosed",
                Remarks = "Auto-closed on logout"
            });
        }

        var activeSupportActivities = await _context.SupportActivityLogs
            .Where(s => s.EmployeeId == employeeId && s.EndTime == null)
            .ToListAsync();

        foreach (var activity in activeSupportActivities)
        {
            activity.EndTime = now;
            activity.Remarks ??= "Auto-closed on logout";

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "SupportActivity",
                RefTable = "SupportActivityLogs",
                RefId = activity.Id,
                StartTime = activity.StartTime,
                EndTime = now,
                Status = "AutoClosed",
                Remarks = "Auto-closed on logout"
            });
        }

        await _idleTimeService.OnPunchOutAsync(employeeId, now);
        await _context.SaveChangesAsync();
    }

    public async Task<AttendanceDto?> GetByDateAsync(int employeeId, DateTime date)
    {
        // Use WorkDate (stored IST date) for the comparison — avoids the UTC/IST
        // midnight edge case where LoginTime.Date (UTC) != the IST calendar date.
        var workDate = DateOnly.FromDateTime(date.Date);

        var attendance = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.WorkDate == workDate)
            .OrderByDescending(a => a.LoginTime)
            .FirstOrDefaultAsync();

        if (attendance == null) return null;

        var settings = await _settingService.GetTypedSettingsAsync();
        return await BuildAttendanceDtoAsync(attendance, settings);
    }

    public async Task<List<AttendanceDto>> GetByRangeAsync(int employeeId, DateTime from, DateTime to)
    {
        var fromDate = DateOnly.FromDateTime(from.Date);
        var toDate = DateOnly.FromDateTime(to.Date);

        var logs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.WorkDate >= fromDate && a.WorkDate <= toDate)
            .OrderByDescending(a => a.LoginTime)
            .ToListAsync();

        var settings = await _settingService.GetTypedSettingsAsync();
        var resultList = new List<AttendanceDto>();

        foreach (var log in logs)
        {
            resultList.Add(await BuildAttendanceDtoAsync(log, settings));
        }

        return resultList;
    }


    public async Task<MarkPermissionResultDto> MarkPermissionAsync(int attendanceId, bool force = false)
    {
        var attendance = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.Id == attendanceId);

        if (attendance == null)
            throw new KeyNotFoundException($"Attendance log #{attendanceId} not found.");

        if (!attendance.IsLate)
            throw new InvalidOperationException("This attendance record was a normal login and cannot be converted to permission.");

        var settings = await _settingService.GetTypedSettingsAsync();

        if (attendance.IsPermission)
        {
            var attDto = await BuildAttendanceDtoAsync(attendance, settings);
            return new MarkPermissionResultDto { WarningNeeded = false, Attendance = attDto };
        }

        var istTime = TimeZoneInfo.ConvertTimeFromUtc(attendance.LoginTime, IstTimeZone);
        
        int monthPermissionCount = await _context.AttendanceLogs
            .CountAsync(a => a.EmployeeId == attendance.EmployeeId && a.IsPermission && a.LoginTime.Year == istTime.Year && a.LoginTime.Month == istTime.Month && a.Id != attendance.Id);

        int allowedPermissions = settings.MonthlyAllowedPermissions;

        if (monthPermissionCount >= allowedPermissions && !force)
        {
            var emp = await _context.Employees.FindAsync(attendance.EmployeeId);
            string empName = emp?.Name ?? "the employee";
            return new MarkPermissionResultDto
            {
                WarningNeeded = true,
                WarningMessage = $"{empName} has already used their monthly allowed permission limit ({monthPermissionCount}/{allowedPermissions} taken for this month). Do you still want to mark an extra permission for this day?"
            };
        }

        attendance.IsPermission = true;
        attendance.PermissionHours = settings.PermissionHours;
        attendance.Status = "Permission";

        await _context.SaveChangesAsync();

        // Recalculate LOP for the month
        await RecalculateMonthlyAttendanceLOPAsync(attendance.EmployeeId, istTime.Year, istTime.Month);

        var finalDto = await BuildAttendanceDtoAsync(attendance, settings);
        return new MarkPermissionResultDto
        {
            WarningNeeded = false,
            Attendance = finalDto
        };
    }

    public async Task<PermissionSummaryDto> GetPermissionSummaryAsync(int employeeId, int year, int month)
    {
        var settings = await _settingService.GetTypedSettingsAsync();

        var monthLogs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime.Year == year && a.LoginTime.Month == month)
            .ToListAsync();

        var usedHours = monthLogs.Where(a => a.IsPermission).Sum(a => a.PermissionHours);
        var allocatedHours = settings.PermissionHours;
        var remainingHours = Math.Max(0m, allocatedHours - usedHours);

        return new PermissionSummaryDto
        {
            EmployeeId = employeeId,
            Year = year,
            Month = month,
            AllocatedHours = allocatedHours,
            UsedHours = usedHours,
            RemainingHours = remainingHours
        };
    }

    public async Task<decimal> RecalculateMonthlyAttendanceLOPAsync(int employeeId, int year, int month)
    {
        var settings = await _settingService.GetTypedSettingsAsync();

        var monthLogs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime.Year == year && a.LoginTime.Month == month)
            .ToListAsync();

        // Crucial Rule: Count ONLY unpermissioned late logins (IsLate == true && IsPermission == false)
        int unpermissionedLateCount = monthLogs.Count(a => a.IsLate && !a.IsPermission);

        int threshold = Math.Max(1, settings.LateLoginsForHalfDay);

        // Every threshold unpermissioned late logins = 0.5 Day LOP
        decimal lopDays = Math.Floor((decimal)unpermissionedLateCount / threshold) * 0.5m;

        var lopRecord = await _context.LOPCalculations
            .FirstOrDefaultAsync(l => l.EmployeeId == employeeId && l.Year == year && l.Month == month);

        string reasonText = $"{unpermissionedLateCount} unpermissioned late login(s) in {month}/{year}";

        if (lopRecord == null)
        {
            lopRecord = new LOPCalculation
            {
                EmployeeId = employeeId,
                Year = year,
                Month = month,
                LOPDays = lopDays,
                Reason = reasonText
            };
            _context.LOPCalculations.Add(lopRecord);
        }
        else
        {
            lopRecord.LOPDays = lopDays;
            lopRecord.Reason = reasonText;
        }

        await _context.SaveChangesAsync();
        return lopDays;
    }

    private async Task CheckAndRecordGraceViolationAsync(int employeeId, DateTime loginTimeUtc, int minutesLate)
    {
        var alreadyRecorded = await _context.GraceTimeViolations
            .AnyAsync(g => g.EmployeeId == employeeId && g.Date.Date == loginTimeUtc.Date);

        if (alreadyRecorded) return;

        var istTime = TimeZoneInfo.ConvertTimeFromUtc(loginTimeUtc, IstTimeZone);

        _context.GraceTimeViolations.Add(new GraceTimeViolation
        {
            EmployeeId = employeeId,
            Date = loginTimeUtc.Date,
            LoginTime = istTime.TimeOfDay,
            MinutesLate = Math.Max(1, minutesLate)
        });
    }

    private async Task<AttendanceDto> BuildAttendanceDtoAsync(AttendanceLog a, TypedSystemSettingsDto settings)
    {
        var duration = a.LogoutTime.HasValue
            ? (a.LogoutTime.Value - a.LoginTime).ToString(@"hh\:mm\:ss")
            : null;

        var istTime = TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone);
        var year = istTime.Year;
        var month = istTime.Month;

        var monthLogs = await _context.AttendanceLogs
            .Where(x => x.EmployeeId == a.EmployeeId && x.LoginTime.Year == year && x.LoginTime.Month == month)
            .ToListAsync();

        int monthlyLateCount = monthLogs.Count(x => x.IsLate && !x.IsPermission);
        int threshold = Math.Max(1, settings.LateLoginsForHalfDay);
        decimal monthlyLop = Math.Floor((decimal)monthlyLateCount / threshold) * 0.5m;

        var officeStartDt = DateTime.Today.Add(settings.OfficeStartTime);
        var graceEndDt = officeStartDt.AddMinutes(settings.GraceMinutes);

        var allowedEndTimeDisplay = a.AllowedEndTime.HasValue
            ? TimeZoneInfo.ConvertTimeFromUtc(a.AllowedEndTime.Value, IstTimeZone).ToString("hh:mm tt")
            : null;

        return new AttendanceDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            LoginTime = a.LoginTime,
            LogoutTime = a.LogoutTime,
            Duration = duration,
            IsLate = a.IsLate,
            IsPermission = a.IsPermission,
            PermissionHours = a.PermissionHours,
            Status = string.IsNullOrEmpty(a.Status) ? (a.IsLate ? "Late" : "Normal") : a.Status,
            OfficeStartTime = officeStartDt.ToString("hh:mm tt"),
            GraceEndTime = graceEndDt.ToString("hh:mm tt"),
            AllowedEndTime = a.AllowedEndTime,
            AllowedEndTimeDisplay = allowedEndTimeDisplay,
            MonthlyLateCount = monthlyLateCount,
            MonthlyLopDays = monthlyLop
        };
    }
}
