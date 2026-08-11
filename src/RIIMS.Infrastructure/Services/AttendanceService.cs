using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Attendance;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class AttendanceService : IAttendanceService
{
    private readonly RiimsDbContext _context;
    private readonly ISystemSettingService _settingService;

    public AttendanceService(RiimsDbContext context, ISystemSettingService settingService)
    {
        _context = context;
        _settingService = settingService;
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

        bool isLate = loginTimeOfDay > graceEnd;
        string status = isLate ? "Late" : "Normal";

        var attendance = new AttendanceLog
        {
            EmployeeId = employeeId,
            LoginTime = now,
            IsLate = isLate,
            IsPermission = false,
            PermissionHours = 0,
            Status = status
        };

        _context.AttendanceLogs.Add(attendance);

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

    public async Task<AttendanceDto> MarkPermissionAsync(int attendanceId)
    {
        var attendance = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.Id == attendanceId);

        if (attendance == null)
            throw new KeyNotFoundException($"Attendance log #{attendanceId} not found.");

        if (!attendance.IsLate)
            throw new InvalidOperationException("This attendance record was a normal login and cannot be converted to permission.");

        if (attendance.IsPermission)
        {
            var existingSettings = await _settingService.GetTypedSettingsAsync();
            return await BuildAttendanceDtoAsync(attendance, existingSettings);
        }

        var istTime = TimeZoneInfo.ConvertTimeFromUtc(attendance.LoginTime, IstTimeZone);
        var permSummary = await GetPermissionSummaryAsync(attendance.EmployeeId, istTime.Year, istTime.Month);

        var settings = await _settingService.GetTypedSettingsAsync();

        if (permSummary.RemainingHours < settings.PermissionHours)
        {
            throw new InvalidOperationException($"Employee has already used their allocated permission ({permSummary.UsedHours}/{permSummary.AllocatedHours} hrs used) for this month.");
        }

        attendance.IsPermission = true;
        attendance.PermissionHours = settings.PermissionHours;
        attendance.Status = "Permission";

        await _context.SaveChangesAsync();

        // Recalculate LOP for the month (permission removes late login count!)
        await RecalculateMonthlyAttendanceLOPAsync(attendance.EmployeeId, istTime.Year, istTime.Month);

        return await BuildAttendanceDtoAsync(attendance, settings);
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
            MonthlyLateCount = monthlyLateCount,
            MonthlyLopDays = monthlyLop
        };
    }
}
