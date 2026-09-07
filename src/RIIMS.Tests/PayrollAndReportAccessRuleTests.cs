using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class PayrollAndReportAccessRuleTests
{
    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new RiimsDbContext(options);
    }

    private static SystemSettingService CreateMockSettingService(RiimsDbContext context)
    {
        return new SystemSettingService(context);
    }

    private static AttendanceCalendarService CreateMockCalendarService(RiimsDbContext context)
    {
        var settingService = CreateMockSettingService(context);
        return new AttendanceCalendarService(context, settingService);
    }

    private static (Department dept, Designation desig, Employee emp) SeedEmployee(RiimsDbContext context)
    {
        var dept = new Department { Id = 1, Name = "Engineering", IsActive = true };
        var desig = new Designation { Id = 1, Name = "Developer", IsActive = true };
        var emp = new Employee
        {
            Id = 1,
            EmployeeCode = "EMP001",
            Name = "John Doe",
            Email = "john@example.com",
            DepartmentId = dept.Id,
            DesignationId = desig.Id,
            IsActive = true,
            DateOfJoining = new DateTime(2024, 1, 1)
        };

        context.Departments.Add(dept);
        context.Designations.Add(desig);
        context.Employees.Add(emp);

        context.EmployeeSalaryStructures.Add(new EmployeeSalaryStructure
        {
            EmployeeId = emp.Id,
            MonthlyCTC = 50000m,
            AnnualCTC = 600000m,
            IsActive = true,
            EffectiveFrom = new DateTime(2024, 1, 1)
        });

        context.SaveChanges();
        return (dept, desig, emp);
    }

    [Fact]
    public async Task ProcessPayroll_CurrentOrFutureMonth_ThrowsInvalidOperationException()
    {
        using var context = CreateInMemoryContext(nameof(ProcessPayroll_CurrentOrFutureMonth_ThrowsInvalidOperationException));
        SeedEmployee(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var payrollService = new PayrollService(context, settingService, calendarService);

        // Current or future month is ongoing or not completely ended
        var current = DateTime.UtcNow;
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            payrollService.ProcessMonthlyPayrollAsync(current.Month, current.Year));

        Assert.Contains("not completely ended", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ProcessPayroll_EndedMonth_WithoutNextMonthCalendarPublished_ThrowsInvalidOperationException()
    {
        using var context = CreateInMemoryContext(nameof(ProcessPayroll_EndedMonth_WithoutNextMonthCalendarPublished_ThrowsInvalidOperationException));
        SeedEmployee(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var payrollService = new PayrollService(context, settingService, calendarService);

        // July 2025 is ended, but August 2025 calendar is not published
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            payrollService.ProcessMonthlyPayrollAsync(7, 2025));

        Assert.Contains("Monthly Attendance Calendar", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("must be published", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ProcessPayroll_EndedMonth_WithNextMonthCalendarPublished_Succeeds()
    {
        using var context = CreateInMemoryContext(nameof(ProcessPayroll_EndedMonth_WithNextMonthCalendarPublished_Succeeds));
        SeedEmployee(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var payrollService = new PayrollService(context, settingService, calendarService);

        // July 2025 is ended, generate July 2025 calendar & publish August 2025 calendar
        await calendarService.GenerateMonthlyCalendarAsync(2025, 7);
        await calendarService.GenerateMonthlyCalendarAsync(2025, 8);
        await calendarService.PublishMonthlyCalendarAsync(2025, 8, 1);

        var result = await payrollService.ProcessMonthlyPayrollAsync(7, 2025);

        Assert.NotNull(result);
        Assert.Equal(7, result.Month);
        Assert.Equal(2025, result.Year);
        Assert.Equal(1, result.TotalEmployees);
    }

    [Fact]
    public async Task MonthlyReport_CurrentOrFutureMonth_ThrowsInvalidOperationException()
    {
        using var context = CreateInMemoryContext(nameof(MonthlyReport_CurrentOrFutureMonth_ThrowsInvalidOperationException));
        SeedEmployee(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        // Current or future month is ongoing or not completely ended
        var current = DateTime.UtcNow;
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            reportService.GetMonthlyReportAsync(current.Year, current.Month));

        Assert.Contains("not completely ended", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MonthlyReport_EndedMonth_WithoutNextMonthCalendarPublished_ThrowsInvalidOperationException()
    {
        using var context = CreateInMemoryContext(nameof(MonthlyReport_EndedMonth_WithoutNextMonthCalendarPublished_ThrowsInvalidOperationException));
        SeedEmployee(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        // July 2025 is ended, but August 2025 calendar is draft / not published
        await calendarService.GenerateMonthlyCalendarAsync(2025, 8); // draft, not published

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            reportService.GetMonthlyReportAsync(2025, 7));

        Assert.Contains("Monthly Attendance Calendar", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("must be published", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MonthlyReport_EndedMonth_WithNextMonthCalendarPublished_Succeeds()
    {
        using var context = CreateInMemoryContext(nameof(MonthlyReport_EndedMonth_WithNextMonthCalendarPublished_Succeeds));
        SeedEmployee(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        // July 2025 is ended, generate July 2025 calendar & publish August 2025 calendar
        await calendarService.GenerateMonthlyCalendarAsync(2025, 7);
        await calendarService.GenerateMonthlyCalendarAsync(2025, 8);
        await calendarService.PublishMonthlyCalendarAsync(2025, 8, 1);

        var report = await reportService.GetMonthlyReportAsync(2025, 7);

        Assert.NotNull(report);
        Assert.Single(report.Items);
        Assert.Equal("EMP001", report.Items[0].EmployeeCode);
    }

    [Fact]
    public async Task ValidateMonthAccessRules_ReturnsAccurateFlagsAndMessages()
    {
        using var context = CreateInMemoryContext(nameof(ValidateMonthAccessRules_ReturnsAccurateFlagsAndMessages));
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);

        // 1. Current / Future month (e.g. 2026/8 or 2026/9)
        var futureValidation = await calendarService.ValidateMonthAccessRulesAsync(2026, 9);
        Assert.False(futureValidation.IsMonthEnded);
        Assert.False(futureValidation.CanProcessPayroll);
        Assert.False(futureValidation.CanGenerateReport);
        Assert.NotNull(futureValidation.ReasonMessage);
        Assert.Equal("October", futureValidation.NextMonthName);
        Assert.Equal(2026, futureValidation.NextYear);

        // 2. Ended month without published next calendar (e.g. 2025/5)
        var endedUnpublished = await calendarService.ValidateMonthAccessRulesAsync(2025, 5);
        Assert.True(endedUnpublished.IsMonthEnded);
        Assert.False(endedUnpublished.IsNextMonthPublished);
        Assert.False(endedUnpublished.CanProcessPayroll);
        Assert.False(endedUnpublished.CanGenerateReport);
        Assert.Contains("June 2025", endedUnpublished.ReasonMessage);

        // 3. Ended month with published next calendar (e.g. 2025/5 after publishing 2025/6)
        await calendarService.GenerateMonthlyCalendarAsync(2025, 6);
        await calendarService.PublishMonthlyCalendarAsync(2025, 6, 1);

        var validMonth = await calendarService.ValidateMonthAccessRulesAsync(2025, 5);
        Assert.True(validMonth.IsMonthEnded);
        Assert.True(validMonth.IsNextMonthPublished);
        Assert.True(validMonth.CanProcessPayroll);
        Assert.True(validMonth.CanGenerateReport);
        Assert.Null(validMonth.ReasonMessage);
    }
}
