using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class MonthlyEmployeeReportTests
{
    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        var context = new RiimsDbContext(options);
        return context;
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

    private static (Department dept, Designation desig) SeedDeptAndDesig(RiimsDbContext context)
    {
        var dept = context.Departments.FirstOrDefault(d => d.Id == 1);
        if (dept == null)
        {
            dept = new Department { Id = 1, Name = "Engineering", IsActive = true };
            context.Departments.Add(dept);
        }

        var desig = context.Designations.FirstOrDefault(d => d.Id == 1);
        if (desig == null)
        {
            desig = new Designation { Id = 1, Name = "Software Engineer", IsActive = true };
            context.Designations.Add(desig);
        }

        context.SaveChanges();
        return (dept, desig);
    }

    [Fact]
    public async Task Test1_MultipleEmployees_DifferentSalaries_VerifiedInReport()
    {
        using var context = CreateInMemoryContext(nameof(Test1_MultipleEmployees_DifferentSalaries_VerifiedInReport));
        var (dept, desig) = SeedDeptAndDesig(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        var emp1 = new Employee { Id = 101, EmployeeCode = "EMP001", Name = "Arun", Email = "arun@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true, DateOfJoining = new DateTime(2025, 1, 1) };
        var emp2 = new Employee { Id = 102, EmployeeCode = "EMP002", Name = "Kumar", Email = "kumar@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true, DateOfJoining = new DateTime(2025, 1, 1) };
        context.Employees.AddRange(emp1, emp2);

        context.EmployeeSalaryStructures.Add(new EmployeeSalaryStructure
        {
            EmployeeId = emp1.Id,
            MonthlyCTC = 33333.33m,
            AnnualCTC = 400000m,
            IsActive = true,
            EffectiveFrom = new DateTime(2025, 1, 1)
        });

        context.EmployeeSalaryStructures.Add(new EmployeeSalaryStructure
        {
            EmployeeId = emp2.Id,
            MonthlyCTC = 50000.00m,
            AnnualCTC = 600000m,
            IsActive = true,
            EffectiveFrom = new DateTime(2025, 1, 1)
        });

        await context.SaveChangesAsync();

        var report = await reportService.GetMonthlyReportAsync(2026, 8);

        Assert.Equal(2, report.Items.Count);
        var r1 = report.Items.First(x => x.EmployeeId == 101);
        var r2 = report.Items.First(x => x.EmployeeId == 102);

        Assert.Equal(33333.33m, r1.MonthlySalary);
        Assert.Equal(50000.00m, r2.MonthlySalary);
    }

    [Fact]
    public async Task Test2_DifferentLeaveAndLOP_Verified()
    {
        using var context = CreateInMemoryContext(nameof(Test2_DifferentLeaveAndLOP_Verified));
        var (dept, desig) = SeedDeptAndDesig(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        var emp1 = new Employee { Id = 201, EmployeeCode = "EMP001", Name = "Arun", Email = "arun@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        var emp2 = new Employee { Id = 202, EmployeeCode = "EMP002", Name = "Kumar", Email = "kumar@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        context.Employees.AddRange(emp1, emp2);

        context.EmployeeSalaryStructures.Add(new EmployeeSalaryStructure { EmployeeId = emp1.Id, MonthlyCTC = 31000m, IsActive = true, EffectiveFrom = new DateTime(2025, 1, 1) });
        context.EmployeeSalaryStructures.Add(new EmployeeSalaryStructure { EmployeeId = emp2.Id, MonthlyCTC = 31000m, IsActive = true, EffectiveFrom = new DateTime(2025, 1, 1) });

        var leaveType = new LeaveType { Id = 1, Name = "Casual Leave" };
        context.LeaveTypes.Add(leaveType);

        // Emp 1: 2 leave days in Aug 2026 (Aug 10 Mon, Aug 11 Tue) => Allowed 1 => LOP 1
        context.LeaveRequests.Add(new LeaveRequest
        {
            EmployeeId = emp1.Id,
            LeaveTypeId = leaveType.Id,
            FromDate = new DateTime(2026, 8, 10),
            ToDate = new DateTime(2026, 8, 11),
            Status = RequestStatus.Approved
        });

        // Emp 2: 1 leave day in Aug 2026 (Aug 10 Mon) => Allowed 1 => LOP 0
        context.LeaveRequests.Add(new LeaveRequest
        {
            EmployeeId = emp2.Id,
            LeaveTypeId = leaveType.Id,
            FromDate = new DateTime(2026, 8, 10),
            ToDate = new DateTime(2026, 8, 10),
            Status = RequestStatus.Approved
        });

        await context.SaveChangesAsync();

        var report = await reportService.GetMonthlyReportAsync(2026, 8);

        var r1 = report.Items.First(x => x.EmployeeId == emp1.Id);
        var r2 = report.Items.First(x => x.EmployeeId == emp2.Id);

        Assert.Equal(2m, r1.ApprovedLeaveDays);
        Assert.Equal(1m, r1.LeaveLOPDays);

        Assert.Equal(1m, r2.ApprovedLeaveDays);
        Assert.Equal(0m, r2.LeaveLOPDays);
    }

    [Fact]
    public async Task Test3_PermissionCounts_EmployeeWiseIsolation()
    {
        using var context = CreateInMemoryContext(nameof(Test3_PermissionCounts_EmployeeWiseIsolation));
        var (dept, desig) = SeedDeptAndDesig(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        var emp1 = new Employee { Id = 301, EmployeeCode = "EMP001", Name = "Arun", Email = "arun@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        var emp2 = new Employee { Id = 302, EmployeeCode = "EMP002", Name = "Kumar", Email = "kumar@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        context.Employees.AddRange(emp1, emp2);

        // Emp 1 has 3 approved permissions
        context.PermissionRequests.Add(new PermissionRequest { EmployeeId = emp1.Id, RequestDate = new DateTime(2026, 8, 5), Status = RequestStatus.Approved });
        context.PermissionRequests.Add(new PermissionRequest { EmployeeId = emp1.Id, RequestDate = new DateTime(2026, 8, 12), Status = RequestStatus.Approved });
        context.PermissionRequests.Add(new PermissionRequest { EmployeeId = emp1.Id, RequestDate = new DateTime(2026, 8, 18), Status = RequestStatus.Approved });

        // Emp 2 has 1 approved permission
        context.PermissionRequests.Add(new PermissionRequest { EmployeeId = emp2.Id, RequestDate = new DateTime(2026, 8, 9), Status = RequestStatus.Approved });

        // Emp 2 has 1 rejected permission (should NOT be counted)
        context.PermissionRequests.Add(new PermissionRequest { EmployeeId = emp2.Id, RequestDate = new DateTime(2026, 8, 15), Status = RequestStatus.Rejected });

        await context.SaveChangesAsync();

        var report = await reportService.GetMonthlyReportAsync(2026, 8);

        var r1 = report.Items.First(x => x.EmployeeId == emp1.Id);
        var r2 = report.Items.First(x => x.EmployeeId == emp2.Id);

        Assert.Equal(3, r1.PermissionCount);
        Assert.Equal(1, r2.PermissionCount);
    }

    [Fact]
    public async Task Test4_LateLoginCounts_EmployeeWiseIsolation()
    {
        using var context = CreateInMemoryContext(nameof(Test4_LateLoginCounts_EmployeeWiseIsolation));
        var (dept, desig) = SeedDeptAndDesig(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        var emp1 = new Employee { Id = 401, EmployeeCode = "EMP001", Name = "Arun", Email = "arun@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        var emp2 = new Employee { Id = 402, EmployeeCode = "EMP002", Name = "Kumar", Email = "kumar@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        context.Employees.AddRange(emp1, emp2);

        // Emp 1: 4 late logins (10:30 AM IST = 05:00 AM UTC)
        for (int i = 3; i <= 6; i++)
        {
            context.AttendanceLogs.Add(new AttendanceLog
            {
                EmployeeId = emp1.Id,
                LoginTime = new DateTime(2026, 8, i, 5, 0, 0, DateTimeKind.Utc),
                IsLate = true
            });
        }

        // Emp 2: 1 late login (10:30 AM IST = 05:00 AM UTC)
        context.AttendanceLogs.Add(new AttendanceLog
        {
            EmployeeId = emp2.Id,
            LoginTime = new DateTime(2026, 8, 5, 5, 0, 0, DateTimeKind.Utc),
            IsLate = true
        });

        await context.SaveChangesAsync();

        var report = await reportService.GetMonthlyReportAsync(2026, 8);

        var r1 = report.Items.First(x => x.EmployeeId == emp1.Id);
        var r2 = report.Items.First(x => x.EmployeeId == emp2.Id);

        Assert.Equal(4, r1.LateLoginCount);
        Assert.Equal(1, r2.LateLoginCount);
    }

    [Fact]
    public async Task Test8_PayslipConsistency_SnapshotPriority()
    {
        using var context = CreateInMemoryContext(nameof(Test8_PayslipConsistency_SnapshotPriority));
        var (dept, desig) = SeedDeptAndDesig(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        var emp = new Employee { Id = 801, EmployeeCode = "EMP001", Name = "Arun", Email = "arun@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        context.Employees.Add(emp);

        // Finalized PayslipDetail snapshot
        context.PayslipDetails.Add(new PayslipDetail
        {
            EmployeeId = emp.Id,
            Month = 8,
            Year = 2026,
            TotalSalary = 33333.33m,
            DailySalary = 1075.2687m,
            MonthlyAllowedLeave = 1,
            ActualLeaveDays = 2,
            SandwichLeaveDays = 0,
            LeaveLOPDays = 1,
            LateLoginLOPDays = 0,
            LOPDays = 1,
            LopDeduction = 1075.27m,
            TotalDeduction = 1075.27m,
            NetPay = 32258.06m
        });

        await context.SaveChangesAsync();

        var report = await reportService.GetMonthlyReportAsync(2026, 8);

        var r = report.Items.First(x => x.EmployeeId == emp.Id);

        Assert.Equal("Finalized", r.PayrollStatus);
        Assert.Equal(33333.33m, r.MonthlySalary);
        Assert.Equal(1075.27m, r.LOPAmount);
        Assert.Equal(1075.27m, r.TotalDeduction);
        Assert.Equal(32258.06m, r.FinalSalary);
    }

    [Fact]
    public async Task Test11_ReadOnly_GuaranteedNoMutation()
    {
        using var context = CreateInMemoryContext(nameof(Test11_ReadOnly_GuaranteedNoMutation));
        var (dept, desig) = SeedDeptAndDesig(context);
        var settingService = CreateMockSettingService(context);
        var calendarService = CreateMockCalendarService(context);
        var reportService = new MonthlyEmployeeReportService(context, settingService, calendarService);

        var emp = new Employee { Id = 901, EmployeeCode = "EMP001", Name = "Arun", Email = "arun@test.com", DepartmentId = dept.Id, DesignationId = desig.Id, IsActive = true };
        context.Employees.Add(emp);
        await context.SaveChangesAsync();

        int initialPayslipCount = await context.PayslipDetails.CountAsync();
        int initialLopCount = await context.LOPCalculations.CountAsync();

        var report = await reportService.GetMonthlyReportAsync(2026, 8);

        int postPayslipCount = await context.PayslipDetails.CountAsync();
        int postLopCount = await context.LOPCalculations.CountAsync();

        Assert.Equal(initialPayslipCount, postPayslipCount);
        Assert.Equal(initialLopCount, postLopCount);
        Assert.Single(report.Items);
        Assert.Equal("Pending / Live Preview", report.Items[0].PayrollStatus);
    }
}
