using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.IdleTime;
using RIIMS.Application.DTOs.Task;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Tests;

public class TaskReassignTests
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
        public Task<EmployeeCurrentStateDto> GetCurrentStateAsync(int employeeId) => Task.FromResult(new EmployeeCurrentStateDto());
    }

    private RiimsDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task Manager_CanReassign_TaskFromReporteeToSelf()
    {
        using var context = CreateInMemoryContext();

        var manager = new Employee
        {
            EmployeeCode = "EMP-011",
            Name = "Arun",
            Email = "arun@test.com",
            IsActive = true
        };
        context.Employees.Add(manager);
        await context.SaveChangesAsync();

        var reportee = new Employee
        {
            EmployeeCode = "EMP-012",
            Name = "Hariharan",
            Email = "hari@test.com",
            ReportingPersonId = manager.Id,
            IsActive = true
        };
        context.Employees.Add(reportee);
        await context.SaveChangesAsync();

        var task = new WorkTask
        {
            EmployeeId = reportee.Id,
            Employee = reportee,
            ModuleName = "Image Reader",
            Description = "Test Task",
            Status = TaskStatusEnum.Assigned,
            Priority = TaskPriority.Medium,
            AssignedByEmployeeId = manager.Id,
            CreatedAt = DateTime.UtcNow
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, new DummyEmailService(), new DummyIdleTimeService());

        var result = await service.ReassignTaskAsync(task.Id, manager.Id, "Employee", new ReassignTaskRequest
        {
            NewEmployeeId = manager.Id,
            Remarks = "Taking ownership of this task."
        });

        Assert.NotNull(result);
        Assert.Equal(manager.Id, result.EmployeeId);
        Assert.Equal("Assigned", result.Status);

        var timelineEvents = await context.TaskTimelineEvents.Where(e => e.WorkTaskId == task.Id).ToListAsync();
        Assert.Contains(timelineEvents, e => e.EventType == "Reassigned" && e.Remarks.Contains("Reassigned from Hariharan to Arun"));
    }

    [Fact]
    public async Task Manager_CannotReassign_TaskToUnrelatedEmployee()
    {
        using var context = CreateInMemoryContext();

        var manager = new Employee
        {
            EmployeeCode = "EMP-011",
            Name = "Arun",
            Email = "arun@test.com",
            IsActive = true
        };
        context.Employees.Add(manager);
        await context.SaveChangesAsync();

        var reportee = new Employee
        {
            EmployeeCode = "EMP-012",
            Name = "Hariharan",
            Email = "hari@test.com",
            ReportingPersonId = manager.Id,
            IsActive = true
        };
        context.Employees.Add(reportee);
        await context.SaveChangesAsync();

        var otherEmployee = new Employee
        {
            EmployeeCode = "EMP-099",
            Name = "Other User",
            Email = "other@test.com",
            ReportingPersonId = 9999, // Not reporting to Arun
            IsActive = true
        };
        context.Employees.Add(otherEmployee);
        await context.SaveChangesAsync();

        var task = new WorkTask
        {
            EmployeeId = reportee.Id,
            ModuleName = "Image Reader",
            Description = "Test Task",
            Status = TaskStatusEnum.Assigned,
            Priority = TaskPriority.Medium,
            AssignedByEmployeeId = manager.Id,
            CreatedAt = DateTime.UtcNow
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, new DummyEmailService(), new DummyIdleTimeService());

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.ReassignTaskAsync(task.Id, manager.Id, "Employee", new ReassignTaskRequest
            {
                NewEmployeeId = otherEmployee.Id,
                Remarks = "Invalid reassignment."
            }));
    }
}
