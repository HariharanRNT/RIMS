using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Task;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Tests;

public class ReminderFiredPersistenceTests
{
    private class DummyEmailService : IEmailService
    {
        public Task SendEmailAsync(string to, string subject, string body, string? cc = null) => Task.CompletedTask;
    }

    private class DummyIdleTimeService : IIdleTimeService
    {
        public Task OnPunchInAsync(int employeeId, DateTime loginTime) => Task.CompletedTask;
        public Task OnPunchOutAsync(int employeeId, DateTime logoutTime) => Task.CompletedTask;
        public Task OnActivityStartingAsync(int employeeId, DateTime activityStartTime, string activityType) => Task.CompletedTask;
        public Task OnActivityEndingAsync(int employeeId, DateTime activityEndTime, string sourceActivityType) => Task.CompletedTask;
        public Task<RIIMS.Application.DTOs.IdleTime.EmployeeCurrentStateDto> GetCurrentStateAsync(int employeeId) => Task.FromResult(new RIIMS.Application.DTOs.IdleTime.EmployeeCurrentStateDto());
        public Task MarkIdleReminderFiredAsync(int employeeId, int milestoneMinutes) => Task.CompletedTask;
    }

    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;
        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task TaskReminders_MarkFired_PersistsAndMapsToActiveTaskDto()
    {
        using var context = CreateInMemoryContext(nameof(TaskReminders_MarkFired_PersistsAndMapsToActiveTaskDto));
        var taskService = new TaskService(context, new DummyEmailService(), new DummyIdleTimeService());

        var employee = new Employee { Id = 10, EmployeeCode = "EMP010", Name = "Test User" };
        var product = new Product { Id = 1, Name = "Product 1", Code = "P1" };
        var client = new Client { Id = 1, CompanyName = "Client 1" };
        context.Employees.Add(employee);
        context.Products.Add(product);
        context.Clients.Add(client);

        var task = new WorkTask
        {
            Id = 100,
            EmployeeId = 10,
            ProductId = 1,
            ClientId = 1,
            ModuleName = "Dev Feature",
            Description = "Developing feature",
            Status = TaskStatusEnum.Running,
            PlannedDurationMinutes = 60,
            Reminder30Fired = false,
            Reminder15Fired = false,
            ReminderCompletionFired = false
        };
        context.WorkTasks.Add(task);
        context.TaskTimeLogs.Add(new TaskTimeLog { TaskId = 100, StartTime = DateTime.UtcNow });
        await context.SaveChangesAsync();

        // 1. Initial state check
        var initialActive = await taskService.GetActiveTaskAsync(10);
        Assert.NotNull(initialActive);
        Assert.False(initialActive.Reminder30Fired);
        Assert.False(initialActive.Reminder15Fired);
        Assert.False(initialActive.ReminderCompletionFired);

        // 2. Mark 30-min reminder fired
        await taskService.MarkReminderFiredAsync(100, 10, "30min");
        var activeAfter30 = await taskService.GetActiveTaskAsync(10);
        Assert.NotNull(activeAfter30);
        Assert.True(activeAfter30.Reminder30Fired);
        Assert.False(activeAfter30.Reminder15Fired);
        Assert.False(activeAfter30.ReminderCompletionFired);

        // 3. Mark 15-min reminder fired
        await taskService.MarkReminderFiredAsync(100, 10, "15min");
        var activeAfter15 = await taskService.GetActiveTaskAsync(10);
        Assert.NotNull(activeAfter15);
        Assert.True(activeAfter15.Reminder30Fired);
        Assert.True(activeAfter15.Reminder15Fired);
        Assert.False(activeAfter15.ReminderCompletionFired);

        // 4. Mark completion reminder fired
        await taskService.MarkReminderFiredAsync(100, 10, "completion");
        var activeAfterComplete = await taskService.GetActiveTaskAsync(10);
        Assert.NotNull(activeAfterComplete);
        Assert.True(activeAfterComplete.Reminder30Fired);
        Assert.True(activeAfterComplete.Reminder15Fired);
        Assert.True(activeAfterComplete.ReminderCompletionFired);
    }

    [Fact]
    public async Task IdleReminders_MarkFired_PersistsAndClearsOnNewStreak()
    {
        using var context = CreateInMemoryContext(nameof(IdleReminders_MarkFired_PersistsAndClearsOnNewStreak));
        var idleService = new IdleTimeService(context);

        var employee = new Employee { Id = 20, EmployeeCode = "EMP020", Name = "Idle User" };
        context.Employees.Add(employee);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var loginTime = DateTime.UtcNow.AddMinutes(-30);

        context.AttendanceLogs.Add(new AttendanceLog { EmployeeId = 20, LoginTime = loginTime });
        context.IdleTimeLogs.Add(new IdleTimeLog
        {
            EmployeeId = 20,
            WorkDate = today,
            StartTime = loginTime,
            EndTime = null,
            Type = "NoActivity",
            Source = "InitialLogin"
        });
        await context.SaveChangesAsync();

        // 1. Initial idle state check
        var state1 = await idleService.GetCurrentStateAsync(20);
        Assert.Equal("IDLE", state1.State);
        Assert.Empty(state1.IdleMilestonesFired);

        // 2. Mark milestones fired (2m, 4m)
        await idleService.MarkIdleReminderFiredAsync(20, 2);
        await idleService.MarkIdleReminderFiredAsync(20, 4);

        var state2 = await idleService.GetCurrentStateAsync(20);
        Assert.Equal(2, state2.IdleMilestonesFired.Count);
        Assert.Contains(2, state2.IdleMilestonesFired);
        Assert.Contains(4, state2.IdleMilestonesFired);

        // 3. Simulate activity starting (idle ends) and then activity ending (fresh idle streak begins)
        var actStart = DateTime.UtcNow.AddMinutes(-10);
        await idleService.OnActivityStartingAsync(20, actStart, "Break");

        var actEnd = DateTime.UtcNow;
        await idleService.OnActivityEndingAsync(20, actEnd, "Break");

        var state3 = await idleService.GetCurrentStateAsync(20);
        Assert.Equal("IDLE", state3.State);
        Assert.Empty(state3.IdleMilestonesFired); // Reset on new idle streak!
    }
}
