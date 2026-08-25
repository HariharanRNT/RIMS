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

        // Close any previous unclosed attendance (concurrent session handling)
        var openAttendance = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.LogoutTime == null);

        if (openAttendance != null)
        {
            openAttendance.LogoutTime = now;
        }

        // Fetch strongly-typed system settings
        var settings = await _settingService.GetTypedSettingsAsync();

        var officeStart = settings.OfficeStartTime;
        var graceEnd = officeStart.Add(TimeSpan.FromMinutes(settings.GraceMinutes));
        var loginTimeOfDay = nowIst.TimeOfDay;
        // Check if an AttendanceLog for this employee already exists on today's WorkDate (in IST)
        var todayLogs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId)
            .ToListAsync();

        var existingTodayLog = todayLogs
            .Where(a => TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone).Date == nowIst.Date)
            .OrderBy(a => a.LoginTime)
            .FirstOrDefault();

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
            var todayDate = DateOnly.FromDateTime(nowIst.Date);
            var todayLeave = await _context.LeaveRequests
                .FirstOrDefaultAsync(l => l.EmployeeId == employeeId &&
                                          l.Status == RequestStatus.Approved &&
                                          l.FromDate.Date <= nowIst.Date &&
                                          l.ToDate.Date >= nowIst.Date);

            var todayPermission = await _context.PermissionRequests
                .FirstOrDefaultAsync(p => p.EmployeeId == employeeId &&
                                          p.Status == RequestStatus.Approved &&
                                          p.RequestDate.Date == nowIst.Date);

            var calEntry = await _context.AttendanceCalendars
                .FirstOrDefaultAsync(c => c.CalendarDate == todayDate);

            var eval = AttendanceRuleEvaluator.EvaluateDay(
                todayDate,
                now,
                null,
                todayLeave,
                todayPermission,
                calEntry,
                settings);

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
                // Rule A: On or before OfficeStartTime -> OfficeEndTime
                allowedEndTimeIst = todayOfficeEndIst;
            }
            else if (loginTimeOfDay <= graceEnd)
            {
                // Rule B: Grace Period (10:01 AM - 10:15 AM) -> Extend by actual delay minutes
                TimeSpan delay = loginTimeOfDay - officeStart;
                allowedEndTimeIst = todayOfficeEndIst.Add(delay);
            }
            else
            {
                // Rule C & Rule D: Late Login (> 10:15 AM) or After OfficeEndTime -> OfficeEndTime (No extension!)
                allowedEndTimeIst = todayOfficeEndIst;
            }

            allowedEndTimeUtc = TimeZoneInfo.ConvertTimeToUtc(allowedEndTimeIst, IstTimeZone);
        }

        var attendance = new AttendanceLog
        {
            EmployeeId = employeeId,
            LoginTime = now,
            LogoutTime = null,
            IsLate = isLate,
            IsPermission = isPermission,
            PermissionHours = isPermission ? settings.PermissionHours : 0m,
            Status = status,
            AllowedEndTime = allowedEndTimeUtc
        };

        _context.AttendanceLogs.Add(attendance);

        // Start open idle record if no active task/support/break
        await _idleTimeService.OnPunchInAsync(employeeId, now);

        if (isLate)
        {
            await CheckAndRecordGraceViolationAsync(employeeId, now, (int)(loginTimeOfDay - officeStart).TotalMinutes);
        }

        await _context.SaveChangesAsync();

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
        var attendance = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime.Date == date.Date)
            .OrderByDescending(a => a.LoginTime)
            .FirstOrDefaultAsync();

        if (attendance == null) return null;

        var settings = await _settingService.GetTypedSettingsAsync();
        return await BuildAttendanceDtoAsync(attendance, settings);
    }

    public async Task<List<AttendanceDto>> GetByRangeAsync(int employeeId, DateTime from, DateTime to)
    {
        var logs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime.Date >= from.Date && a.LoginTime.Date <= to.Date)
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
