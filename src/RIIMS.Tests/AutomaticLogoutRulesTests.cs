using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class AutomaticLogoutRulesTests
{
    private class DummyEmailService : IEmailService
    {
        public Task SendEmailAsync(string to, string subject, string body, string? cc = null) => Task.CompletedTask;
    }

    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new RiimsDbContext(options);
    }

    private static readonly TimeZoneInfo IstTz = GetIstTimeZone();

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

    private static void SeedSettings(RiimsDbContext context)
    {
        context.SystemSettings.AddRange(
            new SystemSetting { Key = "OfficeStartTime", Value = "10:00 AM", Description = "Start" },
            new SystemSetting { Key = "OfficeEndTime", Value = "07:00 PM", Description = "End" },
            new SystemSetting { Key = "GraceMinutes", Value = "15", Description = "Grace" },
            new SystemSetting { Key = "PermissionHours", Value = "1", Description = "Permission" },
            new SystemSetting { Key = "MonthlyAllowedPermissions", Value = "1", Description = "Perm Count" },
            new SystemSetting { Key = "LateLoginsForHalfDay", Value = "2", Description = "Late Count" },
            new SystemSetting { Key = "MonthlyAllowedLeave", Value = "1", Description = "Leave" }
        );
        context.SaveChanges();
    }

    [Theory]
    [InlineData(10, 0, 19, 0, false, "Normal")]      // 10:00 AM -> 7:00 PM (Normal)
    [InlineData(10, 5, 19, 5, false, "Normal")]      // 10:05 AM -> 7:05 PM (Grace 5m extension)
    [InlineData(10, 14, 19, 14, false, "Normal")]    // 10:14 AM -> 7:14 PM (Grace 14m extension)
    [InlineData(10, 15, 19, 15, false, "Normal")]    // 10:15 AM -> 7:15 PM (Grace 15m extension)
    [InlineData(10, 16, 19, 0, true, "Late")]        // 10:16 AM -> 7:00 PM (Late, No extension)
    [InlineData(10, 30, 19, 0, true, "Late")]        // 10:30 AM -> 7:00 PM (Late, No extension)
    [InlineData(11, 0, 19, 0, true, "Late")]         // 11:00 AM -> 7:00 PM (Late, No extension)
    [InlineData(9, 45, 19, 0, false, "Normal")]      // 09:45 AM -> 7:00 PM (Early, never earlier than 7:00 PM)
    public void AllowedEndTime_CalculatesCorrectly_AcrossAllGraceAndLateScenarios(
        int loginHour, int loginMinute, int expectedLogoutHour, int expectedLogoutMinute, bool expectedIsLate, string expectedStatus)
    {
        var officeStartTime = new TimeSpan(10, 0, 0);
        var officeEndTime = new TimeSpan(19, 0, 0);
        var graceMinutes = 15;

        var today = DateTime.UtcNow.Date;
        var loginIst = new DateTime(today.Year, today.Month, today.Day, loginHour, loginMinute, 0);
        var loginTimeOfDay = loginIst.TimeOfDay;

        var graceEnd = officeStartTime.Add(TimeSpan.FromMinutes(graceMinutes));
        var todayOfficeEndIst = loginIst.Date.Add(officeEndTime);

        DateTime allowedEndIst;
        bool isLate;
        string status;

        if (loginTimeOfDay <= officeStartTime)
        {
            // Rule 1: On or before 10:00 AM -> 7:00 PM
            allowedEndIst = todayOfficeEndIst;
            isLate = false;
            status = "Normal";
        }
        else if (loginTimeOfDay <= graceEnd)
        {
            // Rule 2: Within 15m Grace (10:01 AM - 10:15 AM) -> 7:00 PM + login delay
            var delay = loginTimeOfDay - officeStartTime;
            allowedEndIst = todayOfficeEndIst.Add(delay);
            isLate = false;
            status = "Normal";
        }
        else
        {
            // Rule 3: Exceeds Grace (> 10:15 AM) -> 7:00 PM (No extension!)
            allowedEndIst = todayOfficeEndIst;
            isLate = true;
            status = "Late";
        }

        // Never earlier than OfficeEndTime (7:00 PM)
        if (allowedEndIst < todayOfficeEndIst)
        {
            allowedEndIst = todayOfficeEndIst;
        }

        var expectedAllowedEndIst = new DateTime(today.Year, today.Month, today.Day, expectedLogoutHour, expectedLogoutMinute, 0);

        Assert.Equal(expectedAllowedEndIst, allowedEndIst);
        Assert.Equal(expectedIsLate, isLate);
        Assert.Equal(expectedStatus, status);
        Assert.True(allowedEndIst >= todayOfficeEndIst, "AllowedEndTime must never be earlier than OfficeEndTime (7:00 PM).");
    }

    [Fact]
    public async Task AttendanceService_LoginAsync_SetsAllowedEndTimeAndSyncsActiveSession()
    {
        using var context = CreateInMemoryContext(nameof(AttendanceService_LoginAsync_SetsAllowedEndTimeAndSyncsActiveSession));
        SeedSettings(context);

        var settingService = new SystemSettingService(context);
        var idleService = new IdleTimeService(context);
        var attendanceService = new AttendanceService(context, settingService, idleService);

        var emp = new Employee { Id = 1, EmployeeCode = "EMP001", Name = "Test Employee", Email = "test@riims.com", IsActive = true };
        context.Employees.Add(emp);

        var nowUtc = DateTime.UtcNow;
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, IstTz);
        var workDate = DateOnly.FromDateTime(nowIst);

        // Pre-existing active session
        var session = new EmployeeSession
        {
            EmployeeId = emp.Id,
            SessionId = Guid.NewGuid(),
            TokenJti = Guid.NewGuid().ToString(),
            WorkDate = workDate,
            LoginTime = nowUtc,
            LastSeenAt = nowUtc,
            ExpiresAt = nowUtc.AddHours(24),
            IsActive = true,
            AllowedEndTime = null
        };
        context.EmployeeSessions.Add(session);
        await context.SaveChangesAsync();

        // Act
        var result = await attendanceService.LoginAsync(emp.Id);

        // Assert
        Assert.NotNull(result.AllowedEndTime);
        var updatedSession = await context.EmployeeSessions.FirstAsync(s => s.SessionId == session.SessionId);
        Assert.NotNull(updatedSession.AllowedEndTime);
        Assert.Equal(result.AllowedEndTime.Value, updatedSession.AllowedEndTime.Value);
    }

    [Fact]
    public async Task SessionService_EodCleanup_NeverCutsOffBeforeOfficeEndTime()
    {
        using var context = CreateInMemoryContext(nameof(SessionService_EodCleanup_NeverCutsOffBeforeOfficeEndTime));
        SeedSettings(context);

        var settingService = new SystemSettingService(context);
        var idleService = new IdleTimeService(context);
        var attendanceService = new AttendanceService(context, settingService, idleService);
        var taskService = new TaskService(context, new DummyEmailService(), idleService);
        var breakService = new BreakService(context, idleService);
        var supportService = new SupportActivityService(context, idleService);

        var sessionService = new SessionService(
            context,
            attendanceService,
            taskService,
            breakService,
            supportService,
            settingService);

        var emp = new Employee { Id = 2, EmployeeCode = "EMP002", Name = "Jane Doe", Email = "jane@riims.com", IsActive = true };
        context.Employees.Add(emp);

        var nowUtc = DateTime.UtcNow;
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, IstTz);
        var workDate = DateOnly.FromDateTime(nowIst);

        // Active session for today with AllowedEndTime at 7:00 PM (future compared to early afternoon)
        var officeEndIst = nowIst.Date.Add(new TimeSpan(19, 0, 0));
        var officeEndUtc = TimeZoneInfo.ConvertTimeToUtc(officeEndIst, IstTz);

        var session = new EmployeeSession
        {
            EmployeeId = emp.Id,
            SessionId = Guid.NewGuid(),
            TokenJti = Guid.NewGuid().ToString(),
            WorkDate = workDate,
            LoginTime = nowUtc,
            LastSeenAt = nowUtc,
            ExpiresAt = nowUtc.AddHours(24),
            IsActive = true,
            AllowedEndTime = officeEndUtc
        };
        context.EmployeeSessions.Add(session);
        await context.SaveChangesAsync();

        // EOD cleanup must NEVER terminate today's active session, regardless of whether it's before or after 7:00 PM
        await sessionService.PerformWorkdayEodCleanupAsync();

        var todaySession = await context.EmployeeSessions.FirstAsync(s => s.SessionId == session.SessionId);
        Assert.True(todaySession.IsActive, "Today's session must ALWAYS remain active — no forced logout at office end time.");

        // Stale session from a past work date SHOULD be cleaned up
        var pastWorkDate = workDate.AddDays(-1);
        var staleSession = new EmployeeSession
        {
            EmployeeId = emp.Id,
            SessionId = Guid.NewGuid(),
            TokenJti = Guid.NewGuid().ToString(),
            WorkDate = pastWorkDate,
            LoginTime = nowUtc.AddDays(-1),
            LastSeenAt = nowUtc.AddDays(-1),
            ExpiresAt = nowUtc.AddHours(24),
            IsActive = true,
            AllowedEndTime = officeEndUtc.AddDays(-1)
        };
        context.EmployeeSessions.Add(staleSession);
        await context.SaveChangesAsync();

        await sessionService.PerformWorkdayEodCleanupAsync();

        var cleanedStaleSession = await context.EmployeeSessions.IgnoreQueryFilters().FirstAsync(s => s.SessionId == staleSession.SessionId);
        Assert.False(cleanedStaleSession.IsActive, "Stale session from past work date must be deactivated.");
    }

    [Fact]
    public async Task GracePeriod_1014Login_CalculationStopsAt714PM_InsteadOf700PM()
    {
        using var context = CreateInMemoryContext(nameof(GracePeriod_1014Login_CalculationStopsAt714PM_InsteadOf700PM));

        context.SystemSettings.AddRange(
            new SystemSetting { Key = "OfficeStartTime", Value = "10:00 AM", Description = "Start" },
            new SystemSetting { Key = "OfficeEndTime", Value = "07:00 PM", Description = "End" },
            new SystemSetting { Key = "GraceMinutes", Value = "15", Description = "Grace" },
            new SystemSetting { Key = "MonthlyAllowedLeave", Value = "1", Description = "Leave" }
        );
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            Id = 1,
            EmployeeCode = "EMP001",
            Name = "Grace Employee",
            Email = "grace@riims.local",
            IsActive = true
        };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        var settingService = new SystemSettingService(context);
        var idleService = new IdleTimeService(context, settingService);

        var todayIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTz).Date;
        var loginIst = new DateTime(todayIst.Year, todayIst.Month, todayIst.Day, 10, 14, 0);
        var loginUtc = TimeZoneInfo.ConvertTimeToUtc(loginIst, IstTz);

        // AllowedEndTime for 10:14 AM login is 7:14 PM IST
        var allowedEndIst = new DateTime(todayIst.Year, todayIst.Month, todayIst.Day, 19, 14, 0);
        var allowedEndUtc = TimeZoneInfo.ConvertTimeToUtc(allowedEndIst, IstTz);

        var attLog = new AttendanceLog
        {
            Id = 1,
            EmployeeId = emp.Id,
            WorkDate = DateOnly.FromDateTime(todayIst),
            LoginTime = loginUtc,
            AllowedEndTime = allowedEndUtc,
            Status = "Present"
        };
        context.AttendanceLogs.Add(attLog);

        // Task running from 6:30 PM to 7:20 PM IST (50 minutes total)
        // Since AllowedEndTime is 7:14 PM, duration should be capped at 7:14 PM => 44 minutes = 2640 seconds.
        var task = new WorkTask
        {
            Id = 10,
            EmployeeId = emp.Id,
            ModuleName = "Grace Work",
            Description = "Test",
            Status = RIIMS.Domain.Enums.TaskStatus.Running
        };
        context.WorkTasks.Add(task);

        var taskStartIst = new DateTime(todayIst.Year, todayIst.Month, todayIst.Day, 18, 30, 0);
        var taskEndIst = new DateTime(todayIst.Year, todayIst.Month, todayIst.Day, 19, 20, 0);
        var taskStartUtc = TimeZoneInfo.ConvertTimeToUtc(taskStartIst, IstTz);
        var taskEndUtc = TimeZoneInfo.ConvertTimeToUtc(taskEndIst, IstTz);

        context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = taskStartUtc,
            EndTime = taskEndUtc
        });
        await context.SaveChangesAsync();

        var state = await idleService.GetCurrentStateAsync(emp.Id);

        // 6:30 PM to 7:14 PM = 44 minutes = 2640 seconds
        Assert.Equal(2640, state.TodayWorkSeconds);
    }
}
