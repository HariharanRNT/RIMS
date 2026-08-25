using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Tests;

public class IdleTimeServiceTests
{
    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task Scenario1_Login_NoActivity_StartsIdleLog()
    {
        using var context = CreateInMemoryContext(nameof(Scenario1_Login_NoActivity_StartsIdleLog));
        var idleService = new IdleTimeService(context);

        var loginTime = new DateTime(2026, 8, 17, 10, 0, 0, DateTimeKind.Utc);
        context.AttendanceLogs.Add(new AttendanceLog { EmployeeId = 1, LoginTime = loginTime });
        await context.SaveChangesAsync();

        await idleService.OnPunchInAsync(1, loginTime);

        var openIdle = await context.IdleTimeLogs.FirstOrDefaultAsync(i => i.EmployeeId == 1 && i.EndTime == null);
        Assert.NotNull(openIdle);
        Assert.Equal(loginTime, openIdle.StartTime);
        Assert.Equal("InitialLogin", openIdle.Source);
    }

    [Fact]
    public async Task Scenario2_StartTask_ClosesOpenIdleLog()
    {
        using var context = CreateInMemoryContext(nameof(Scenario2_StartTask_ClosesOpenIdleLog));
        var idleService = new IdleTimeService(context);

        var loginTime = new DateTime(2026, 8, 17, 10, 0, 0, DateTimeKind.Utc);
        var taskStartTime = new DateTime(2026, 8, 17, 10, 15, 0, DateTimeKind.Utc);

        context.AttendanceLogs.Add(new AttendanceLog { EmployeeId = 1, LoginTime = loginTime });
        context.IdleTimeLogs.Add(new IdleTimeLog { EmployeeId = 1, WorkDate = new DateOnly(2026, 8, 17), StartTime = loginTime, EndTime = null });
        await context.SaveChangesAsync();

        await idleService.OnActivityStartingAsync(1, taskStartTime, "Task");

        var idle = await context.IdleTimeLogs.FirstOrDefaultAsync(i => i.EmployeeId == 1);
        Assert.NotNull(idle);
        Assert.Equal(taskStartTime, idle.EndTime);
        Assert.Equal(900, idle.DurationSeconds); // 15 mins = 900s
    }

    [Fact]
    public async Task Scenario3_TaskEnded_StartsNewIdleLog()
    {
        using var context = CreateInMemoryContext(nameof(Scenario3_TaskEnded_StartsNewIdleLog));
        var idleService = new IdleTimeService(context);

        var taskEndTime = new DateTime(2026, 8, 17, 11, 30, 0, DateTimeKind.Utc);
        context.AttendanceLogs.Add(new AttendanceLog { EmployeeId = 1, LoginTime = new DateTime(2026, 8, 17, 10, 0, 0, DateTimeKind.Utc) });
        await context.SaveChangesAsync();

        await idleService.OnActivityEndingAsync(1, taskEndTime, "Task");

        var openIdle = await context.IdleTimeLogs.FirstOrDefaultAsync(i => i.EmployeeId == 1 && i.EndTime == null);
        Assert.NotNull(openIdle);
        Assert.Equal(taskEndTime, openIdle.StartTime);
        Assert.Equal("PostTask", openIdle.Source);
    }

    [Fact]
    public async Task Scenario4_SameDayLogout_ClosesIdleLog_AndLoginAgain_StartsNewIdleLog()
    {
        using var context = CreateInMemoryContext(nameof(Scenario4_SameDayLogout_ClosesIdleLog_AndLoginAgain_StartsNewIdleLog));
        var idleService = new IdleTimeService(context);

        var login1 = new DateTime(2026, 8, 17, 10, 0, 0, DateTimeKind.Utc);
        var logout1 = new DateTime(2026, 8, 17, 12, 0, 0, DateTimeKind.Utc);
        var login2 = new DateTime(2026, 8, 17, 14, 0, 0, DateTimeKind.Utc);

        var attendance1 = new AttendanceLog { EmployeeId = 1, LoginTime = login1 };
        context.AttendanceLogs.Add(attendance1);
        await context.SaveChangesAsync();

        // 10:00 AM Login -> open idle
        await idleService.OnPunchInAsync(1, login1);

        // 12:00 PM Logout -> closes open idle
        attendance1.LogoutTime = logout1;
        await idleService.OnPunchOutAsync(1, logout1);

        var firstIdle = await context.IdleTimeLogs.FirstAsync(i => i.EmployeeId == 1);
        Assert.Equal(logout1, firstIdle.EndTime);
        Assert.Equal(7200, firstIdle.DurationSeconds); // 2 hours = 7200s

        // 2:00 PM Login -> new open idle
        context.AttendanceLogs.Add(new AttendanceLog { EmployeeId = 1, LoginTime = login2 });
        await context.SaveChangesAsync();
        await idleService.OnPunchInAsync(1, login2);

        var secondIdle = await context.IdleTimeLogs.FirstOrDefaultAsync(i => i.EmployeeId == 1 && i.EndTime == null);
        Assert.NotNull(secondIdle);
        Assert.Equal(login2, secondIdle.StartTime);
    }

    [Fact]
    public async Task Scenario5_GetCurrentState_ReturnsServerAuthoritativeStateAndTotals()
    {
        using var context = CreateInMemoryContext(nameof(Scenario5_GetCurrentState_ReturnsServerAuthoritativeStateAndTotals));
        var idleService = new IdleTimeService(context);

        var loginTime = new DateTime(2026, 8, 17, 10, 0, 0, DateTimeKind.Utc);
        context.AttendanceLogs.Add(new AttendanceLog { Id = 10, EmployeeId = 1, LoginTime = loginTime });

        // Add 1 completed idle log (10:00 - 10:15 = 900s)
        context.IdleTimeLogs.Add(new IdleTimeLog
        {
            EmployeeId = 1,
            WorkDate = new DateOnly(2026, 8, 17),
            StartTime = loginTime,
            EndTime = loginTime.AddMinutes(15),
            DurationSeconds = 900,
            DurationMinutes = 15
        });

        // Currently running task started at 10:15
        var task = new WorkTask { Id = 100, EmployeeId = 1, Status = TaskStatusEnum.Running, ModuleName = "Feature A", Description = "Test" };
        context.WorkTasks.Add(task);
        context.TaskTimeLogs.Add(new TaskTimeLog { TaskId = 100, StartTime = loginTime.AddMinutes(15), EndTime = null });

        await context.SaveChangesAsync();

        var state = await idleService.GetCurrentStateAsync(1);

        Assert.Equal("TASK", state.State);
        Assert.Equal(10, state.AttendanceSessionId);
        Assert.Equal(100, state.ActiveTaskId);
        Assert.Equal(900, state.TodayIdleSeconds);
        Assert.Equal(1, state.TodayActivitiesCount);
    }
}
