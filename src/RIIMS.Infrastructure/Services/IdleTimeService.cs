using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.IdleTime;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class IdleTimeService : IIdleTimeService
{
    private readonly RiimsDbContext _context;

    public IdleTimeService(RiimsDbContext context)
    {
        _context = context;
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

    public async Task OnPunchInAsync(int employeeId, DateTime loginTime)
    {
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(loginTime, IstTimeZone);
        var workDate = DateOnly.FromDateTime(nowIst);

        // Auto-close any stale open IdleTimeLogs from previous dates
        var staleIdleLogs = await _context.IdleTimeLogs
            .Where(i => i.EmployeeId == employeeId && i.EndTime == null && i.WorkDate < workDate)
            .ToListAsync();

        foreach (var stale in staleIdleLogs)
        {
            stale.EndTime = stale.StartTime;
            stale.DurationSeconds = 0;
            stale.DurationMinutes = 0;
        }

        // Check if any active task, support, or break is running
        var hasActiveTask = await _context.WorkTasks.AnyAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running);
        var hasActiveSupport = await _context.SupportActivityLogs.AnyAsync(s => s.EmployeeId == employeeId && s.EndTime == null);
        var hasActiveBreak = await _context.BreakLogs.AnyAsync(b => b.EmployeeId == employeeId && b.EndTime == null);

        if (!hasActiveTask && !hasActiveSupport && !hasActiveBreak)
        {
            var openIdle = await _context.IdleTimeLogs
                .FirstOrDefaultAsync(i => i.EmployeeId == employeeId && i.EndTime == null && i.WorkDate == workDate);

            if (openIdle == null)
            {
                _context.IdleTimeLogs.Add(new IdleTimeLog
                {
                    EmployeeId = employeeId,
                    WorkDate = workDate,
                    StartTime = loginTime,
                    EndTime = null,
                    DurationMinutes = 0,
                    DurationSeconds = 0,
                    Type = "NoActivity",
                    Source = "InitialLogin",
                    Remarks = "Logged in with no active activity"
                });
            }
        }
        await _context.SaveChangesAsync();
    }

    public async Task OnPunchOutAsync(int employeeId, DateTime logoutTime)
    {
        var openIdleLogs = await _context.IdleTimeLogs
            .Where(i => i.EmployeeId == employeeId && i.EndTime == null)
            .ToListAsync();

        foreach (var idle in openIdleLogs)
        {
            var end = logoutTime > idle.StartTime ? logoutTime : idle.StartTime;
            idle.EndTime = end;
            idle.DurationSeconds = (long)Math.Max(0, (end - idle.StartTime).TotalSeconds);
            idle.DurationMinutes = (int)Math.Max(0, Math.Round(idle.DurationSeconds / 60.0));
        }

        await _context.SaveChangesAsync();
    }

    public async Task OnActivityStartingAsync(int employeeId, DateTime activityStartTime, string activityType)
    {
        var openIdleLogs = await _context.IdleTimeLogs
            .Where(i => i.EmployeeId == employeeId && i.EndTime == null)
            .ToListAsync();

        foreach (var idle in openIdleLogs)
        {
            var end = activityStartTime > idle.StartTime ? activityStartTime : idle.StartTime;
            idle.EndTime = end;
            idle.DurationSeconds = (long)Math.Max(0, (end - idle.StartTime).TotalSeconds);
            idle.DurationMinutes = (int)Math.Max(0, Math.Round(idle.DurationSeconds / 60.0));
        }

        await _context.SaveChangesAsync();
    }

    public async Task OnActivityEndingAsync(int employeeId, DateTime activityEndTime, string sourceActivityType)
    {
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(activityEndTime, IstTimeZone);
        var workDate = DateOnly.FromDateTime(nowIst);

        // Check if employee is logged in today
        var isLoggedIn = await _context.AttendanceLogs
            .AnyAsync(a => a.EmployeeId == employeeId && a.LogoutTime == null);

        if (!isLoggedIn) return;

        // Check if any other activity is running (taking EF local change tracker into account)
        var activeTaskInDb = await _context.WorkTasks.Where(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running).Select(t => t.Id).ToListAsync();
        var activeTaskLocalStopped = _context.WorkTasks.Local.Where(t => t.EmployeeId == employeeId && t.Status != TaskStatusEnum.Running).Select(t => t.Id).ToList();
        var hasActiveTask = activeTaskInDb.Except(activeTaskLocalStopped).Any();

        var activeSupportInDb = await _context.SupportActivityLogs.Where(s => s.EmployeeId == employeeId && s.EndTime == null).Select(s => s.Id).ToListAsync();
        var activeSupportLocalStopped = _context.SupportActivityLogs.Local.Where(s => s.EmployeeId == employeeId && s.EndTime != null).Select(s => s.Id).ToList();
        var hasActiveSupport = activeSupportInDb.Except(activeSupportLocalStopped).Any();

        var activeBreakInDb = await _context.BreakLogs.Where(b => b.EmployeeId == employeeId && b.EndTime == null).Select(b => b.Id).ToListAsync();
        var activeBreakLocalStopped = _context.BreakLogs.Local.Where(b => b.EmployeeId == employeeId && b.EndTime != null).Select(b => b.Id).ToList();
        var hasActiveBreak = activeBreakInDb.Except(activeBreakLocalStopped).Any();

        if (!hasActiveTask && !hasActiveSupport && !hasActiveBreak)
        {
            var openIdle = await _context.IdleTimeLogs
                .FirstOrDefaultAsync(i => i.EmployeeId == employeeId && i.EndTime == null && i.WorkDate == workDate);

            if (openIdle == null)
            {
                _context.IdleTimeLogs.Add(new IdleTimeLog
                {
                    EmployeeId = employeeId,
                    WorkDate = workDate,
                    StartTime = activityEndTime,
                    EndTime = null,
                    DurationMinutes = 0,
                    DurationSeconds = 0,
                    Type = "NoActivity",
                    Source = $"Post{sourceActivityType}",
                    Remarks = $"Started idle after {sourceActivityType} ended"
                });
                await _context.SaveChangesAsync();
            }
        }
    }

    public async Task<EmployeeCurrentStateDto> GetCurrentStateAsync(int employeeId)
    {
        var nowUtc = DateTime.UtcNow;
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, IstTimeZone);
        var todayWorkDate = DateOnly.FromDateTime(nowIst);
        var todayStartUtc = TimeZoneInfo.ConvertTimeToUtc(todayWorkDate.ToDateTime(TimeOnly.MinValue), IstTimeZone);

        // 1. Check Attendance Session
        var openAttendance = await _context.AttendanceLogs
            .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.LogoutTime == null);

        if (openAttendance == null)
        {
            return new EmployeeCurrentStateDto
            {
                State = "LOGGED_OUT",
                AttendanceSessionId = null
            };
        }

        // 2. Auto-close any stale unclosed idle logs from past dates
        var staleIdleLogs = await _context.IdleTimeLogs
            .Where(i => i.EmployeeId == employeeId && i.EndTime == null && i.WorkDate < todayWorkDate)
            .ToListAsync();

        if (staleIdleLogs.Any())
        {
            foreach (var stale in staleIdleLogs)
            {
                stale.EndTime = stale.StartTime;
                stale.DurationSeconds = 0;
                stale.DurationMinutes = 0;
            }
            await _context.SaveChangesAsync();
        }

        // 3. Check Active Entities
        var activeBreak = await _context.BreakLogs
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.EndTime == null);

        var activeSupport = await _context.SupportActivityLogs
            .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.EndTime == null);

        var activeTask = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running);

        var openIdle = await _context.IdleTimeLogs
            .FirstOrDefaultAsync(i => i.EmployeeId == employeeId && i.EndTime == null && i.WorkDate == todayWorkDate);

        string currentState;
        DateTime? activityStartedAt = null;

        if (activeBreak != null)
        {
            currentState = "BREAK";
            activityStartedAt = activeBreak.StartTime;
        }
        else if (activeSupport != null)
        {
            currentState = "SUPPORT_ACTIVITY";
            activityStartedAt = activeSupport.StartTime;
        }
        else if (activeTask != null)
        {
            currentState = "TASK";
            var openTimeLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == activeTask.Id && tl.EndTime == null);
            activityStartedAt = openTimeLog?.StartTime ?? nowUtc;
        }
        else
        {
            currentState = "IDLE";
        }

        if (currentState == "IDLE" && openIdle == null)
        {
            // Find start of current idle period (end of last task/support/break, or login time)
            var lastTaskLog = await _context.TaskTimeLogs
                .Include(tl => tl.Task)
                .Where(tl => tl.Task.EmployeeId == employeeId && tl.EndTime != null && tl.StartTime >= todayStartUtc)
                .OrderByDescending(tl => tl.EndTime)
                .FirstOrDefaultAsync();

            var lastSupportLog = await _context.SupportActivityLogs
                .Where(s => s.EmployeeId == employeeId && s.EndTime != null && s.StartTime >= todayStartUtc)
                .OrderByDescending(s => s.EndTime)
                .FirstOrDefaultAsync();

            var lastBreakLog = await _context.BreakLogs
                .Where(b => b.EmployeeId == employeeId && b.StartTime >= todayStartUtc && b.EndTime != null)
                .OrderByDescending(b => b.EndTime)
                .FirstOrDefaultAsync();

            var candidateStarts = new List<DateTime> { openAttendance.LoginTime };
            if (lastTaskLog?.EndTime != null) candidateStarts.Add(lastTaskLog.EndTime.Value);
            if (lastSupportLog?.EndTime != null) candidateStarts.Add(lastSupportLog.EndTime.Value);
            if (lastBreakLog?.EndTime != null) candidateStarts.Add(lastBreakLog.EndTime.Value);

            var idleStart = candidateStarts.Max();

            openIdle = new IdleTimeLog
            {
                EmployeeId = employeeId,
                WorkDate = todayWorkDate,
                StartTime = idleStart,
                EndTime = null,
                DurationMinutes = 0,
                DurationSeconds = 0,
                Type = "NoActivity",
                Source = "AutoRecovered",
                Remarks = "Auto-recovered active idle session"
            };
            _context.IdleTimeLogs.Add(openIdle);
            await _context.SaveChangesAsync();
        }

        // 3. Calculate Today's Totals
        // Work Seconds
        var todayTimeLogs = await _context.TaskTimeLogs
            .Include(tl => tl.Task)
            .Where(tl => tl.Task.EmployeeId == employeeId && tl.StartTime >= todayStartUtc)
            .ToListAsync();

        long workSeconds = 0;
        foreach (var log in todayTimeLogs)
        {
            var end = log.EndTime ?? nowUtc;
            workSeconds += (long)Math.Max(0, (end - log.StartTime).TotalSeconds);
        }

        // Support Seconds
        var todaySupportLogs = await _context.SupportActivityLogs
            .Where(s => s.EmployeeId == employeeId && s.StartTime >= todayStartUtc)
            .ToListAsync();

        long supportSeconds = 0;
        foreach (var s in todaySupportLogs)
        {
            var end = s.EndTime ?? nowUtc;
            supportSeconds += (long)Math.Max(0, (end - s.StartTime).TotalSeconds);
        }

        // Break Seconds
        var todayBreakLogs = await _context.BreakLogs
            .Where(b => b.EmployeeId == employeeId && b.StartTime >= todayStartUtc)
            .ToListAsync();

        long breakSeconds = 0;
        foreach (var b in todayBreakLogs)
        {
            var end = b.EndTime ?? nowUtc;
            breakSeconds += (long)Math.Max(0, (end - b.StartTime).TotalSeconds);
        }

        // Idle Seconds: Compute gap within attendance sessions today
        var todayAttendanceSessions = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= todayStartUtc)
            .ToListAsync();

        long idleSeconds = 0;
        foreach (var att in todayAttendanceSessions)
        {
            var sessionStart = att.LoginTime;
            var sessionEnd = att.LogoutTime ?? nowUtc;
            if (sessionEnd <= sessionStart) continue;

            double sessionTotalSec = (sessionEnd - sessionStart).TotalSeconds;

            double tSec = todayTimeLogs
                .Where(tl => tl.StartTime < sessionEnd && (tl.EndTime ?? nowUtc) > sessionStart)
                .Sum(tl => (Math.Min((tl.EndTime ?? nowUtc).Ticks, sessionEnd.Ticks) - Math.Max(tl.StartTime.Ticks, sessionStart.Ticks)) / (double)TimeSpan.TicksPerSecond);

            double sSec = todaySupportLogs
                .Where(s => s.StartTime < sessionEnd && (s.EndTime ?? nowUtc) > sessionStart)
                .Sum(s => (Math.Min((s.EndTime ?? nowUtc).Ticks, sessionEnd.Ticks) - Math.Max(s.StartTime.Ticks, sessionStart.Ticks)) / (double)TimeSpan.TicksPerSecond);

            double bSec = todayBreakLogs
                .Where(b => b.StartTime < sessionEnd && (b.EndTime ?? nowUtc) > sessionStart)
                .Sum(b => (Math.Min((b.EndTime ?? nowUtc).Ticks, sessionEnd.Ticks) - Math.Max(b.StartTime.Ticks, sessionStart.Ticks)) / (double)TimeSpan.TicksPerSecond);

            double sessionIdle = Math.Max(0, sessionTotalSec - tSec - sSec - bSec);
            idleSeconds += (long)Math.Round(sessionIdle);
        }

        // Distinct Activities Count Today
        int taskCountToday = todayTimeLogs.Select(tl => tl.TaskId).Distinct().Count();
        int supportCountToday = todaySupportLogs.Count;
        int breakCountToday = todayBreakLogs.Count;
        int totalActivities = taskCountToday + supportCountToday + breakCountToday;

        return new EmployeeCurrentStateDto
        {
            State = currentState,
            AttendanceSessionId = openAttendance.Id,
            IdleStartedAt = openIdle?.StartTime,
            ActivityStartedAt = activityStartedAt,
            ActiveTaskId = activeTask?.Id,
            ActiveSupportId = activeSupport?.Id,
            ActiveBreakId = activeBreak?.Id,
            TodayWorkSeconds = workSeconds + supportSeconds,
            TodayBreakSeconds = breakSeconds,
            TodayIdleSeconds = idleSeconds,
            TodayActivitiesCount = totalActivities
        };
    }
}
