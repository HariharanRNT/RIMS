using System;
using System.Linq;
using System.Threading.Tasks;
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

public class TaskDueDateAndNotificationTests
{
    private class CapturingEmailService : IEmailService
    {
        public string? LastTo { get; private set; }
        public string? LastSubject { get; private set; }
        public string? LastBody { get; private set; }

        public Task SendEmailAsync(string to, string subject, string body, string? cc = null)
        {
            LastTo = to;
            LastSubject = subject;
            LastBody = body;
            return Task.CompletedTask;
        }
    }

    private class DummyIdleTimeService : IIdleTimeService
    {
        public Task OnPunchInAsync(int employeeId, DateTime loginTime) => Task.CompletedTask;
        public Task OnPunchOutAsync(int employeeId, DateTime logoutTime) => Task.CompletedTask;
        public Task OnActivityStartingAsync(int employeeId, DateTime activityStartTime, string activityType) => Task.CompletedTask;
        public Task OnActivityEndingAsync(int employeeId, DateTime activityEndTime, string sourceActivityType) => Task.CompletedTask;
        public Task<EmployeeCurrentStateDto> GetCurrentStateAsync(int employeeId) => Task.FromResult(new EmployeeCurrentStateDto());
        public Task MarkIdleReminderFiredAsync(int employeeId, int milestoneMinutes) => Task.CompletedTask;
    }

    private RiimsDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task Task_CreatedToday_WithTodayDueDate_IsNotOverdue()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(emp);

        var prod = new Product { Name = "Jinni", Code = "JIN", IsActive = true };
        context.Products.Add(prod);
        var client = new Client { CompanyName = "RNT", IsActive = true };
        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var today = DateTime.UtcNow.Date;

        var task = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            ProductId = prod.Id,
            Product = prod,
            ClientId = client.Id,
            Client = client,
            ModuleName = "WEB UI",
            Description = "WEB UI - Demo",
            Status = TaskStatusEnum.Running,
            Priority = TaskPriority.High,
            PlannedStart = today,
            DueDate = today,
            CreatedAt = DateTime.UtcNow
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, new CapturingEmailService(), new DummyIdleTimeService());
        var tasks = await service.GetAdminTasksAsync(employeeId: emp.Id);
        var result = tasks.FirstOrDefault(t => t.Id == task.Id);

        Assert.NotNull(result);
        Assert.False(result.IsOverdue, "Task with due date today should NOT be marked overdue during the day.");
    }

    [Fact]
    public async Task Task_WithPastDueDate_IsNotCompleted_IsOverdue()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        var yesterday = DateTime.UtcNow.Date.AddDays(-1);

        var task = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            CustomProductName = "Jinni",
            CustomClientName = "RNT",
            ModuleName = "WEB UI",
            Description = "WEB UI - Demo",
            Status = TaskStatusEnum.Running,
            Priority = TaskPriority.High,
            PlannedStart = yesterday,
            DueDate = yesterday,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, new CapturingEmailService(), new DummyIdleTimeService());
        var tasks = await service.GetAdminTasksAsync(employeeId: emp.Id);
        var result = tasks.FirstOrDefault(t => t.Id == task.Id);

        Assert.NotNull(result);
        Assert.True(result.IsOverdue, "Task with yesterday's due date and Running status SHOULD be marked overdue.");
    }

    [Fact]
    public async Task Task_WithPastDueDate_WhenCompleted_IsNotOverdue()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        var past = DateTime.UtcNow.Date.AddDays(-2);

        var task = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            CustomProductName = "Jinni",
            CustomClientName = "RNT",
            ModuleName = "WEB UI",
            Description = "WEB UI - Demo",
            Status = TaskStatusEnum.Completed,
            Priority = TaskPriority.High,
            PlannedStart = past,
            DueDate = past,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        var service = new TaskService(context, new CapturingEmailService(), new DummyIdleTimeService());
        var tasks = await service.GetAdminTasksAsync(employeeId: emp.Id);
        var result = tasks.FirstOrDefault(t => t.Id == task.Id);

        Assert.NotNull(result);
        Assert.False(result.IsOverdue, "Completed task should NOT be marked overdue even if due date is in the past.");
    }

    [Fact]
    public async Task AssignTaskAsync_EmailNotification_FormatsDatesAsDateOnly()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var admin = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Arun Pandian",
            Email = "arun@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(admin);
        await context.SaveChangesAsync();

        var reportee = new Employee
        {
            EmployeeCode = "EMP-002",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            ReportingPersonId = admin.Id,
            IsActive = true
        };
        context.Employees.Add(reportee);

        var prod = new Product { Name = "Jinni", Code = "JIN", IsActive = true };
        context.Products.Add(prod);
        var client = new Client { CompanyName = "RNT", IsActive = true };
        context.Clients.Add(client);
        await context.SaveChangesAsync();

        var emailService = new CapturingEmailService();
        var service = new TaskService(context, emailService, new DummyIdleTimeService());

        var specificDate = new DateTime(2026, 9, 3, 0, 0, 0, DateTimeKind.Utc);

        var result = await service.AssignTaskAsync(admin.Id, "Admin", new AssignTaskRequest
        {
            EmployeeId = reportee.Id,
            ProductId = prod.Id,
            ClientId = client.Id,
            ModuleName = "WEB UI",
            Description = "WEB UI - Demo",
            Priority = TaskPriority.High,
            PlannedStart = specificDate,
            DueDate = specificDate,
            PlannedDurationMinutes = 360
        });

        Assert.NotNull(result);
        Assert.NotNull(emailService.LastBody);

        // Check date formatting: should contain "03-Sep-2026" and NOT "12:00 AM" or "00:00"
        Assert.Contains("03-Sep-2026", emailService.LastBody);
        Assert.DoesNotContain("12:00 AM", emailService.LastBody);
        Assert.DoesNotContain("12:00 PM", emailService.LastBody);
    }

    [Fact]
    public async Task Task_WithActualTimeExceedingPlannedDuration_IsNotOverdue_HasIsExceededDurationTrue()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        var today = DateTime.UtcNow.Date;

        // Planned 2 hours (120 minutes), Due today
        var task = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            CustomProductName = "Jinni",
            CustomClientName = "RNT",
            ModuleName = "Feature Dev",
            Description = "Long running task",
            Status = TaskStatusEnum.Running,
            Priority = TaskPriority.Medium,
            PlannedStart = today,
            DueDate = today,
            PlannedDurationMinutes = 120, // 2 hours
            CreatedAt = DateTime.UtcNow
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        // 2.5 hours worked (9000 seconds = 150 minutes)
        var start = DateTime.UtcNow.AddHours(-2.5);
        context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = start,
            EndTime = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var service = new TaskService(context, new CapturingEmailService(), new DummyIdleTimeService());
        var tasks = await service.GetAdminTasksAsync(employeeId: emp.Id);
        var result = tasks.FirstOrDefault(t => t.Id == task.Id);

        Assert.NotNull(result);
        Assert.False(result.IsOverdue, "Task due today must NOT be marked Overdue even if it exceeded planned duration.");
        Assert.True(result.IsExceededDuration, "Task that took 2.5h with planned 2h MUST have IsExceededDuration = true.");
        Assert.Equal("Running", result.Status);
    }

    [Fact]
    public async Task Task_WithActualTimeLessThanPlannedDuration_IsNotExceeded()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        var today = DateTime.UtcNow.Date;

        // Planned 2 hours (120 minutes), Worked 1 hour (60 minutes)
        var task = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            CustomProductName = "Jinni",
            CustomClientName = "RNT",
            ModuleName = "Quick fix",
            Description = "Short task",
            Status = TaskStatusEnum.Running,
            Priority = TaskPriority.Medium,
            PlannedStart = today,
            DueDate = today,
            PlannedDurationMinutes = 120, // 2 hours
            CreatedAt = DateTime.UtcNow
        };
        context.WorkTasks.Add(task);
        await context.SaveChangesAsync();

        var start = DateTime.UtcNow.AddHours(-1);
        context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = start,
            EndTime = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var service = new TaskService(context, new CapturingEmailService(), new DummyIdleTimeService());
        var tasks = await service.GetAdminTasksAsync(employeeId: emp.Id);
        var result = tasks.FirstOrDefault(t => t.Id == task.Id);

        Assert.NotNull(result);
        Assert.False(result.IsOverdue);
        Assert.False(result.IsExceededDuration);
    }

    [Fact]
    public async Task GetAdminTasksAsync_SeparateFilters_OverdueAndExceededDuration_WorkIndependently()
    {
        using var context = CreateInMemoryContext();

        var dept = new Department { Name = "Engineering" };
        context.Departments.Add(dept);
        var desig = new Designation { Name = "Developer" };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Naveen S",
            Email = "naveen@test.com",
            DepartmentId = dept.Id,
            Department = dept,
            DesignationId = desig.Id,
            Designation = desig,
            IsActive = true
        };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        var today = DateTime.UtcNow.Date;
        var yesterday = today.AddDays(-1);

        // Task 1: Due today, Exceeded duration (Planned 1h, Worked 2h) -> Exceeded only
        var task1 = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            CustomProductName = "Product 1",
            CustomClientName = "Client 1",
            ModuleName = "Task 1",
            Description = "Due today, exceeded duration",
            Status = TaskStatusEnum.Running,
            Priority = TaskPriority.Medium,
            PlannedStart = today,
            DueDate = today,
            PlannedDurationMinutes = 60,
            CreatedAt = DateTime.UtcNow
        };
        context.WorkTasks.Add(task1);

        // Task 2: Due yesterday, NOT exceeded duration (Planned 2h, Worked 0.5h) -> Overdue only
        var task2 = new WorkTask
        {
            EmployeeId = emp.Id,
            Employee = emp,
            CustomProductName = "Product 2",
            CustomClientName = "Client 2",
            ModuleName = "Task 2",
            Description = "Due yesterday, within duration",
            Status = TaskStatusEnum.Running,
            Priority = TaskPriority.Medium,
            PlannedStart = yesterday,
            DueDate = yesterday,
            PlannedDurationMinutes = 120,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        context.WorkTasks.Add(task2);
        await context.SaveChangesAsync();

        context.TaskTimeLogs.Add(new TaskTimeLog { TaskId = task1.Id, StartTime = DateTime.UtcNow.AddHours(-2), EndTime = DateTime.UtcNow });
        context.TaskTimeLogs.Add(new TaskTimeLog { TaskId = task2.Id, StartTime = DateTime.UtcNow.AddMinutes(-30), EndTime = DateTime.UtcNow });
        await context.SaveChangesAsync();

        var service = new TaskService(context, new CapturingEmailService(), new DummyIdleTimeService());

        // Filter 1: Overdue only -> should return ONLY Task 2
        var overdueOnly = await service.GetAdminTasksAsync(employeeId: emp.Id, isOverdue: true);
        Assert.Single(overdueOnly);
        Assert.Equal(task2.Id, overdueOnly[0].Id);

        // Filter 2: Exceeded duration only -> should return ONLY Task 1
        var exceededOnly = await service.GetAdminTasksAsync(employeeId: emp.Id, isExceededDuration: true);
        Assert.Single(exceededOnly);
        Assert.Equal(task1.Id, exceededOnly[0].Id);
    }
}
