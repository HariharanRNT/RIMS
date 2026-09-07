using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Break;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;
using Xunit;

namespace RIIMS.Tests;

public class BreakTaskResumeTests
{
    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task StartAndStopBreak_WhenTaskWasRunning_PausesAndAutoResumesTask()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(StartAndStopBreak_WhenTaskWasRunning_PausesAndAutoResumesTask));
        var idleService = new IdleTimeService(context);
        var breakService = new BreakService(context, idleService);

        var employee = new Employee { Id = 1, Name = "Hariharan", EmployeeCode = "EMP001", Email = "hari@example.com" };
        var breakType = new BreakType { Id = 1, Name = "Tea Break", AllowedMinutes = 15, IsActive = true };
        var task = new WorkTask
        {
            Id = 10,
            EmployeeId = 1,
            ModuleName = "Core",
            Description = "Implement Feature X",
            Priority = TaskPriority.Medium,
            Status = TaskStatusEnum.Running
        };

        context.Employees.Add(employee);
        context.BreakTypes.Add(breakType);
        context.WorkTasks.Add(task);
        context.TaskTimeLogs.Add(new TaskTimeLog { TaskId = 10, StartTime = DateTime.UtcNow.AddMinutes(-30) });
        await context.SaveChangesAsync();

        // Act 1: Start Break
        var startResult = await breakService.StartBreakAsync(1, new StartBreakRequest { BreakTypeId = 1 });

        // Assert 1: Task should be paused to OnHold and HeldTaskId linked
        var taskAfterBreakStart = await context.WorkTasks.FindAsync(10);
        Assert.Equal(TaskStatusEnum.OnHold, taskAfterBreakStart!.Status);
        Assert.Equal(10, startResult.HeldTaskId);

        // Act 2: Stop Break
        var stopResult = await breakService.StopBreakAsync(startResult.Id, 1);

        // Assert 2: Task should be auto-resumed back to Running
        var taskAfterBreakStop = await context.WorkTasks.FindAsync(10);
        Assert.Equal(TaskStatusEnum.Running, taskAfterBreakStop!.Status);
        Assert.NotNull(stopResult.EndTime);
    }

    [Fact]
    public async Task StartAndStopBreak_WhenNoTaskWasRunning_DoesNotResumeOrStartAnyTask()
    {
        // Arrange: Employee has an existing OnHold task from earlier, but NO active Running task
        var context = CreateInMemoryContext(nameof(StartAndStopBreak_WhenNoTaskWasRunning_DoesNotResumeOrStartAnyTask));
        var idleService = new IdleTimeService(context);
        var breakService = new BreakService(context, idleService);

        var employee = new Employee { Id = 1, Name = "Hariharan", EmployeeCode = "EMP001", Email = "hari@example.com" };
        var breakType = new BreakType { Id = 1, Name = "Tea Break", AllowedMinutes = 15, IsActive = true };
        var earlierOnHoldTask = new WorkTask
        {
            Id = 20,
            EmployeeId = 1,
            ModuleName = "Reports",
            Description = "Old Paused Task",
            Priority = TaskPriority.Low,
            Status = TaskStatusEnum.OnHold
        };

        context.Employees.Add(employee);
        context.BreakTypes.Add(breakType);
        context.WorkTasks.Add(earlierOnHoldTask);
        await context.SaveChangesAsync();

        // Act 1: Start Break when no task is running
        var startResult = await breakService.StartBreakAsync(1, new StartBreakRequest { BreakTypeId = 1 });

        // Assert 1: HeldTaskId must be NULL because no task was actively running
        Assert.Null(startResult.HeldTaskId);
        var taskAfterBreakStart = await context.WorkTasks.FindAsync(20);
        Assert.Equal(TaskStatusEnum.OnHold, taskAfterBreakStart!.Status);

        // Act 2: Stop Break
        var stopResult = await breakService.StopBreakAsync(startResult.Id, 1);

        // Assert 2: Task must REMAIN OnHold and NOT be resumed
        var taskAfterBreakStop = await context.WorkTasks.FindAsync(20);
        Assert.Equal(TaskStatusEnum.OnHold, taskAfterBreakStop!.Status);
        Assert.NotNull(stopResult.EndTime);

        // Verify no running tasks exist for this employee
        var anyRunning = await context.WorkTasks.AnyAsync(t => t.EmployeeId == 1 && t.Status == TaskStatusEnum.Running);
        Assert.False(anyRunning);
    }

    [Fact]
    public async Task StartAndStopBreak_WhenEmployeeHasZeroTasks_StopsCleanly()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(StartAndStopBreak_WhenEmployeeHasZeroTasks_StopsCleanly));
        var idleService = new IdleTimeService(context);
        var breakService = new BreakService(context, idleService);

        var employee = new Employee { Id = 2, Name = "Deepa", EmployeeCode = "EMP002", Email = "deepa@example.com" };
        var breakType = new BreakType { Id = 2, Name = "Lunch Break", AllowedMinutes = 60, IsActive = true };

        context.Employees.Add(employee);
        context.BreakTypes.Add(breakType);
        await context.SaveChangesAsync();

        // Act
        var startResult = await breakService.StartBreakAsync(2, new StartBreakRequest { BreakTypeId = 2 });
        Assert.Null(startResult.HeldTaskId);

        var stopResult = await breakService.StopBreakAsync(startResult.Id, 2);
        Assert.NotNull(stopResult.EndTime);

        var activeBreak = await breakService.GetActiveBreakAsync(2);
        Assert.Null(activeBreak);
    }
}
