using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Session;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class SessionService : ISessionService
{
    private readonly RiimsDbContext _context;
    private readonly IAttendanceService _attendanceService;
    private readonly ITaskService _taskService;
    private readonly IBreakService _breakService;
    private readonly ISupportActivityService _supportService;
    private readonly ISystemSettingService _settingService;

    public SessionService(
        RiimsDbContext context,
        IAttendanceService attendanceService,
        ITaskService taskService,
        IBreakService breakService,
        ISupportActivityService supportService,
        ISystemSettingService settingService)
    {
        _context = context;
        _attendanceService = attendanceService;
        _taskService = taskService;
        _breakService = breakService;
        _supportService = supportService;
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

    public async Task<(Guid SessionId, string TokenJti)> CreateSessionAsync(int employeeId, string? deviceInfo = null)
    {
        var nowUtc = DateTime.UtcNow;
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, IstTimeZone);
        var workDate = DateOnly.FromDateTime(nowIst);

        // 1. Single Active Session Policy: Invalidate previous active sessions for this employee
        var previousActiveSessions = await _context.EmployeeSessions
            .Where(s => s.EmployeeId == employeeId && s.IsActive)
            .ToListAsync();

        foreach (var prevSession in previousActiveSessions)
        {
            prevSession.IsActive = false;
            prevSession.LogoutTime = nowUtc;
        }

        // Fetch single authoritative AllowedEndTime from today's AttendanceLog
        var todayAttendance = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId)
            .ToListAsync();

        var firstTodayAttendance = todayAttendance
            .Where(a => TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone).Date == workDate.ToDateTime(TimeOnly.MinValue).Date)
            .OrderBy(a => a.LoginTime)
            .FirstOrDefault();

        DateTime? allowedEndTime = firstTodayAttendance?.AllowedEndTime;

        // 2. Create new session
        var sessionId = Guid.NewGuid();
        var tokenJti = Guid.NewGuid().ToString();

        var session = new EmployeeSession
        {
            EmployeeId = employeeId,
            SessionId = sessionId,
            TokenJti = tokenJti,
            WorkDate = workDate,
            LoginTime = nowUtc,
            LastSeenAt = nowUtc,
            ExpiresAt = nowUtc.AddHours(24),
            LogoutTime = null,
            AllowedEndTime = allowedEndTime,
            IsActive = true,
            DeviceInfo = deviceInfo
        };

        _context.EmployeeSessions.Add(session);
        await _context.SaveChangesAsync();

        return (sessionId, tokenJti);
    }

    public async Task<bool> ValidateSessionAsync(Guid sessionId, string tokenJti)
    {
        var session = await _context.EmployeeSessions
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.TokenJti == tokenJti);

        if (session == null || !session.IsActive) return false;

        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);
        var todayWorkDate = DateOnly.FromDateTime(nowIst);

        // Session WorkDate must match today's WorkDate and session must not be expired
        if (session.WorkDate != todayWorkDate || DateTime.UtcNow > session.ExpiresAt)
        {
            return false;
        }

        return true;
    }

    public async Task UpdateHeartbeatAsync(Guid sessionId)
    {
        var session = await _context.EmployeeSessions
            .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.IsActive);

        if (session != null)
        {
            session.LastSeenAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task InvalidateEmployeeSessionsAsync(int employeeId)
    {
        var activeSessions = await _context.EmployeeSessions
            .Where(s => s.EmployeeId == employeeId && s.IsActive)
            .ToListAsync();

        var nowUtc = DateTime.UtcNow;
        foreach (var session in activeSessions)
        {
            session.IsActive = false;
            session.LogoutTime = nowUtc;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<CurrentServerStateDto> GetCurrentServerStateAsync(int employeeId)
    {
        var nowUtc = DateTime.UtcNow;
        var attendance = await _attendanceService.GetByDateAsync(employeeId, nowUtc.Date);
        var activeTask = await _taskService.GetActiveTaskAsync(employeeId);
        var activeBreak = await _breakService.GetActiveBreakAsync(employeeId);
        var activeSupport = await _supportService.GetActiveSupportAsync(employeeId);

        return new CurrentServerStateDto
        {
            Attendance = attendance,
            ActiveTask = activeTask,
            ActiveBreak = activeBreak,
            ActiveSupport = activeSupport
        };
    }

    public async Task PerformWorkdayEodCleanupAsync()
    {
        var nowUtc = DateTime.UtcNow;
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, IstTimeZone);
        var todayWorkDate = DateOnly.FromDateTime(nowIst);

        var activeSessions = await _context.EmployeeSessions
            .Where(s => s.IsActive)
            .ToListAsync();

        if (!activeSessions.Any()) return;

        var settings = await _settingService.GetTypedSettingsAsync();

        foreach (var session in activeSessions)
        {
            // Determine exact AllowedEndTime for session
            DateTime workdayCutoffUtc;
            if (session.AllowedEndTime.HasValue)
            {
                workdayCutoffUtc = session.AllowedEndTime.Value;
            }
            else
            {
                var officeEndTs = settings.OfficeEndTime;
                var workDateTimeIst = session.WorkDate.ToDateTime(TimeOnly.FromTimeSpan(officeEndTs));
                workdayCutoffUtc = TimeZoneInfo.ConvertTimeToUtc(workDateTimeIst, IstTimeZone);
            }

            // Perform cutoff only if current time has reached AllowedEndTime OR session is from a past WorkDate
            if (nowUtc < workdayCutoffUtc && session.WorkDate >= todayWorkDate)
            {
                continue;
            }

            int empId = session.EmployeeId;

            // 1. Cap open TaskTimeLogs EXACTLY at AllowedEndTime (workdayCutoffUtc)
            var runningTasks = await _context.WorkTasks
                .Where(t => t.EmployeeId == empId && t.Status == TaskStatusEnum.Running)
                .ToListAsync();

            foreach (var task in runningTasks)
            {
                task.Status = TaskStatusEnum.OnHold;
                var openLog = await _context.TaskTimeLogs
                    .FirstOrDefaultAsync(tl => tl.TaskId == task.Id && tl.EndTime == null);

                if (openLog != null)
                {
                    openLog.EndTime = workdayCutoffUtc > openLog.StartTime ? workdayCutoffUtc : openLog.StartTime;
                }

                _context.ActivityTimelines.Add(new ActivityTimeline
                {
                    EmployeeId = empId,
                    ActivityType = "Task",
                    RefTable = "Tasks",
                    RefId = task.Id,
                    StartTime = openLog?.StartTime ?? workdayCutoffUtc,
                    EndTime = workdayCutoffUtc,
                    Status = "AutoHeld",
                    Remarks = "Auto-held at employee daily allowed end time."
                });
            }

            // 2. Cap open BreakLogs EXACTLY at AllowedEndTime (workdayCutoffUtc)
            var openBreaks = await _context.BreakLogs
                .Where(b => b.EmployeeId == empId && b.EndTime == null)
                .ToListAsync();

            foreach (var b in openBreaks)
            {
                b.EndTime = workdayCutoffUtc > b.StartTime ? workdayCutoffUtc : b.StartTime;
                _context.ActivityTimelines.Add(new ActivityTimeline
                {
                    EmployeeId = empId,
                    ActivityType = "Break",
                    RefTable = "BreakLogs",
                    RefId = b.Id,
                    StartTime = b.StartTime,
                    EndTime = workdayCutoffUtc,
                    Status = "AutoClosed",
                    Remarks = "Auto-closed at employee daily allowed end time."
                });
            }

            // 3. Cap open SupportActivityLogs EXACTLY at AllowedEndTime (workdayCutoffUtc)
            var openSupports = await _context.SupportActivityLogs
                .Where(s => s.EmployeeId == empId && s.EndTime == null)
                .ToListAsync();

            foreach (var s in openSupports)
            {
                s.EndTime = workdayCutoffUtc > s.StartTime ? workdayCutoffUtc : s.StartTime;
                s.Remarks ??= "Auto-closed at employee daily allowed end time.";
                _context.ActivityTimelines.Add(new ActivityTimeline
                {
                    EmployeeId = empId,
                    ActivityType = "SupportActivity",
                    RefTable = "SupportActivityLogs",
                    RefId = s.Id,
                    StartTime = s.StartTime,
                    EndTime = workdayCutoffUtc,
                    Status = "AutoClosed",
                    Remarks = "Auto-closed at employee daily allowed end time."
                });
            }

            // 4. Cap open AttendanceLog EXACTLY at AllowedEndTime (workdayCutoffUtc)
            var openAttendance = await _context.AttendanceLogs
                .FirstOrDefaultAsync(a => a.EmployeeId == empId && a.LogoutTime == null);

            if (openAttendance != null)
            {
                openAttendance.LogoutTime = workdayCutoffUtc > openAttendance.LoginTime ? workdayCutoffUtc : openAttendance.LoginTime;
            }

            // Deactivate session
            session.IsActive = false;
            session.LogoutTime = workdayCutoffUtc;
        }

        await _context.SaveChangesAsync();
    }
}
