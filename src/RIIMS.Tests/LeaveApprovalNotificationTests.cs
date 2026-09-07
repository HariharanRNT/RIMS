using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class LeaveApprovalNotificationTests
{
    private class MockEmailService : IEmailService
    {
        public List<(string To, string Subject, string Body, string? Cc)> SentEmails { get; } = new();

        public Task SendEmailAsync(string to, string subject, string body, string? cc = null)
        {
            SentEmails.Add((to, subject, body, cc));
            return Task.CompletedTask;
        }
    }

    private RiimsDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task ApproveLeaveAsync_SendsStructuredHtmlNotification()
    {
        using var context = CreateInMemoryContext();
        var mockEmail = new MockEmailService();
        var leaveService = new LeaveService(context, mockEmail);

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Arun",
            Email = "arun@test.com",
            IsActive = true
        };
        var leaveType = new LeaveType
        {
            Name = "Casual Leave"
        };
        context.Employees.Add(emp);
        context.LeaveTypes.Add(leaveType);
        await context.SaveChangesAsync();

        var leave = new LeaveRequest
        {
            EmployeeId = emp.Id,
            LeaveTypeId = leaveType.Id,
            FromDate = new DateTime(2026, 11, 6),
            ToDate = new DateTime(2026, 11, 6),
            LeaveDuration = LeaveDuration.FullDay,
            Reason = "Personal work",
            Status = RequestStatus.Pending
        };
        context.LeaveRequests.Add(leave);
        await context.SaveChangesAsync();

        // Act
        await leaveService.ApproveLeaveAsync(leave.Id, approverEmployeeId: 99);

        // Assert
        Assert.Single(mockEmail.SentEmails);
        var (to, subject, body, _) = mockEmail.SentEmails[0];

        Assert.Equal("arun@test.com", to);
        Assert.Contains("✅ Leave Request Approved", subject);
        Assert.Contains("Casual Leave", subject);

        // Content Assertions
        Assert.Contains("Hello Arun", body);
        Assert.Contains("Casual Leave", body);
        Assert.Contains("2026-11-06", body);
        Assert.Contains("Duration", body);
        Assert.Contains("1 Day", body);
        Assert.Contains("APPROVED", body);
        Assert.Contains("inform your team", body);
        Assert.Contains("RIMS Approval Engine", body);

        // Card style HTML
        Assert.Contains("<table", body);
        Assert.Contains("background-color:", body);

        // Reason shouldn't be included in approved leave summary
        Assert.DoesNotContain("<td style=\"padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; width: 120px; border-top: 1px solid #e2e8f0; vertical-align: top;\">Reason</td>", body);
    }

    [Fact]
    public async Task RejectLeaveAsync_SendsStructuredHtmlNotificationWithReason()
    {
        using var context = CreateInMemoryContext();
        var mockEmail = new MockEmailService();
        var leaveService = new LeaveService(context, mockEmail);

        var emp = new Employee
        {
            EmployeeCode = "EMP-001",
            Name = "Arun",
            Email = "arun@test.com",
            IsActive = true
        };
        var leaveType = new LeaveType
        {
            Name = "Casual Leave"
        };
        context.Employees.Add(emp);
        context.LeaveTypes.Add(leaveType);
        await context.SaveChangesAsync();

        var leave = new LeaveRequest
        {
            EmployeeId = emp.Id,
            LeaveTypeId = leaveType.Id,
            FromDate = new DateTime(2026, 11, 6),
            ToDate = new DateTime(2026, 11, 6),
            LeaveDuration = LeaveDuration.FullDay,
            Reason = "Project crunch deadline conflict",
            Status = RequestStatus.Pending
        };
        context.LeaveRequests.Add(leave);
        await context.SaveChangesAsync();

        // Act
        await leaveService.RejectLeaveAsync(leave.Id, approverEmployeeId: 99);

        // Assert
        Assert.Single(mockEmail.SentEmails);
        var (to, subject, body, _) = mockEmail.SentEmails[0];

        Assert.Equal("arun@test.com", to);
        Assert.Contains("❌ Leave Request Rejected", subject);
        Assert.Contains("Casual Leave", subject);

        // Content Assertions
        Assert.Contains("Hello Arun", body);
        Assert.Contains("Casual Leave", body);
        Assert.Contains("2026-11-06", body);
        Assert.Contains("Duration", body);
        Assert.Contains("1 Day", body);
        Assert.Contains("REJECTED", body);
        Assert.Contains("Reason", body);
        Assert.Contains("Project crunch deadline conflict", body);
        Assert.Contains("contact your reporting manager", body);
        Assert.Contains("RIMS Approval Engine", body);
    }

    [Fact]
    public async Task HalfDayLeave_ShowsCorrectDurationText()
    {
        using var context = CreateInMemoryContext();
        var mockEmail = new MockEmailService();
        var leaveService = new LeaveService(context, mockEmail);

        var emp = new Employee
        {
            EmployeeCode = "EMP-002",
            Name = "Priya",
            Email = "priya@test.com",
            IsActive = true
        };
        var leaveType = new LeaveType
        {
            Name = "Sick Leave"
        };
        context.Employees.Add(emp);
        context.LeaveTypes.Add(leaveType);
        await context.SaveChangesAsync();

        var leave = new LeaveRequest
        {
            EmployeeId = emp.Id,
            LeaveTypeId = leaveType.Id,
            FromDate = new DateTime(2026, 12, 1),
            ToDate = new DateTime(2026, 12, 1),
            LeaveDuration = LeaveDuration.HalfDay,
            HalfDayType = HalfDayType.FirstHalf,
            Reason = "Doctor appointment",
            Status = RequestStatus.Pending
        };
        context.LeaveRequests.Add(leave);
        await context.SaveChangesAsync();

        // Act
        await leaveService.ApproveLeaveAsync(leave.Id, approverEmployeeId: 99);

        // Assert
        Assert.Single(mockEmail.SentEmails);
        var (_, _, body, _) = mockEmail.SentEmails[0];

        Assert.Contains("0.5 Day (First Half)", body);
    }
}
