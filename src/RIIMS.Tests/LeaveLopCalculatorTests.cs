using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class LeaveLopCalculatorTests
{
    private static List<AttendanceCalendarDto> CreateAugust2026Calendar()
    {
        // August 2026 has 31 days. Aug 1 is Saturday, Aug 2 is Sunday, Aug 7 is Friday, Aug 8 Sat, Aug 9 Sun, Aug 10 Mon.
        var list = new List<AttendanceCalendarDto>();
        int days = DateTime.DaysInMonth(2026, 8);

        for (int d = 1; d <= days; d++)
        {
            var date = new DateOnly(2026, 8, d);
            DayOfWeek dow = date.ToDateTime(TimeOnly.MinValue).DayOfWeek;
            bool isWeekend = dow == DayOfWeek.Saturday || dow == DayOfWeek.Sunday;

            list.Add(new AttendanceCalendarDto
            {
                Id = d,
                CalendarDate = date,
                Year = 2026,
                Month = 8,
                DayType = isWeekend ? AttendanceDayType.Weekend : AttendanceDayType.WorkingDay,
                IsWorkingDay = !isWeekend,
                IsHoliday = false,
                IsPublished = true
            });
        }

        return list;
    }

    private static LeaveRequest CreateApprovedLeave(int empId, DateTime from, DateTime to, string reason = "Personal Leave")
    {
        return new LeaveRequest
        {
            Id = 1,
            EmployeeId = empId,
            FromDate = from,
            ToDate = to,
            Status = RequestStatus.Approved,
            Reason = reason,
            LeaveType = new LeaveType { Id = 1, Name = "Casual Leave" }
        };
    }

    [Fact]
    public void TestCase1_Allowed1_Leave1_LopIs0()
    {
        // Test Case 1: Allowed Leave = 1, Employee Leave = 1 => LOP = 0
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 3), new DateTime(2026, 8, 3)) // Mon Aug 3
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(1m, result.ActualLeaveDays);
        Assert.Equal(0m, result.SandwichLeaveDays);
        Assert.Equal(1m, result.TotalLeaveLOPDays);
        Assert.Equal(0m, result.LeaveLOPDays);
        Assert.Equal(0m, result.TotalLOPAmount);
    }

    [Fact]
    public void TestCase2_Allowed1_Leave2_LopIs1()
    {
        // Test Case 2: Allowed Leave = 1, Employee Leave = 2 => LOP = 1
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 3), new DateTime(2026, 8, 4)) // Mon Aug 3 - Tue Aug 4
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(2m, result.ActualLeaveDays);
        Assert.Equal(0m, result.SandwichLeaveDays);
        Assert.Equal(2m, result.TotalLeaveLOPDays);
        Assert.Equal(1m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase3_Allowed1_Leave4_LopIs3()
    {
        // Test Case 3: Allowed Leave = 1, Employee Leave = 4 => LOP = 3
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 3), new DateTime(2026, 8, 6)) // Mon Aug 3 - Thu Aug 6
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(4m, result.ActualLeaveDays);
        Assert.Equal(0m, result.SandwichLeaveDays);
        Assert.Equal(4m, result.TotalLeaveLOPDays);
        Assert.Equal(3m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase4_FriLeave_SatSunWeekend_MonLeave_Allowed1_Sandwich4_Lop3()
    {
        // Test Case 4: Fri Aug 7 (Leave), Sat Aug 8 (W), Sun Aug 9 (W), Mon Aug 10 (Leave)
        // Allowed Leave = 1 => Sandwich Days = 2, Actual Leave = 2 => Total = 4, LOP = 3
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 7), new DateTime(2026, 8, 7)),
            CreateApprovedLeave(empId, new DateTime(2026, 8, 10), new DateTime(2026, 8, 10))
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(2m, result.ActualLeaveDays);
        Assert.Equal(2m, result.SandwichLeaveDays);
        Assert.Equal(4m, result.TotalLeaveLOPDays);
        Assert.Equal(3m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase5_FriLeave_SatSunWeekend_MonLeave_NextMonLeave_Allowed1_Total5_Lop4()
    {
        // Test Case 5: Fri Aug 7 (Leave), Sat Aug 8, Sun Aug 9, Mon Aug 10 (Leave), Next Mon Aug 17 (Leave)
        // Total = 5, Allowed = 1 => LOP = 4
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 7), new DateTime(2026, 8, 7)),
            CreateApprovedLeave(empId, new DateTime(2026, 8, 10), new DateTime(2026, 8, 10)),
            CreateApprovedLeave(empId, new DateTime(2026, 8, 17), new DateTime(2026, 8, 17))
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(3m, result.ActualLeaveDays);
        Assert.Equal(2m, result.SandwichLeaveDays);
        Assert.Equal(5m, result.TotalLeaveLOPDays);
        Assert.Equal(4m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase6_SatSunWeekend_MonLeave_Allowed1_Sandwich0_Lop0()
    {
        // Test Case 6: Sat/Sun Weekend, Mon Leave -> Only Monday is leave. Sandwich = 0, LOP = 0
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 10), new DateTime(2026, 8, 10))
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(1m, result.ActualLeaveDays);
        Assert.Equal(0m, result.SandwichLeaveDays);
        Assert.Equal(1m, result.TotalLeaveLOPDays);
        Assert.Equal(0m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase7_FriLeave_SatSunWeekend_Allowed1_Sandwich0_Lop0()
    {
        // Test Case 7: Fri Leave, Sat/Sun Weekend -> Only Friday is leave. Sandwich = 0, LOP = 0
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 7), new DateTime(2026, 8, 7))
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(1m, result.ActualLeaveDays);
        Assert.Equal(0m, result.SandwichLeaveDays);
        Assert.Equal(1m, result.TotalLeaveLOPDays);
        Assert.Equal(0m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase8_WeekendOnly_NoLeave_Sandwich0_Lop0_Absent0()
    {
        // Test Case 8: Weekend only, no leave => Leave = 0, Sandwich = 0, LOP = 0, Absent = 0
        int empId = 1;
        var calendar = CreateAugust2026Calendar();

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, new List<LeaveRequest>(), new List<AttendanceLog>());

        Assert.Equal(0m, result.ActualLeaveDays);
        Assert.Equal(0m, result.SandwichLeaveDays);
        Assert.Equal(0m, result.TotalLOPDays);
        Assert.Equal(0, result.DailyDetails.Count(d => d.Status == "Absent" && (d.DayType == AttendanceDayType.Weekend)));
    }

    [Fact]
    public void TestCase9_CompanyHoliday_NoLogin_Absent0_Leave0_Lop0()
    {
        // Test Case 9: Company Holiday without login => Absent = 0, Leave = 0, LOP = 0
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        // Set Aug 15 (Independence Day) as CompanyHoliday
        var aug15 = calendar.First(c => c.CalendarDate == new DateOnly(2026, 8, 15));
        aug15.DayType = AttendanceDayType.CompanyHoliday;
        aug15.IsWorkingDay = false;
        aug15.HolidayName = "Independence Day";

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, new List<LeaveRequest>(), new List<AttendanceLog>());

        var holidayDetail = result.DailyDetails.First(d => d.Date == new DateOnly(2026, 8, 15));
        Assert.Equal("Holiday", holidayDetail.Status);
        Assert.False(holidayDetail.IsLop);
        Assert.Equal(0m, result.TotalLOPDays);
    }

    [Fact]
    public void TestCase10_Allowed2_EmployeeLeave5_Lop3()
    {
        // Test Case 10: Monthly Allowed Leave = 2, Employee Leave = 5 => LOP = 3
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 3), new DateTime(2026, 8, 7)) // 5 working days (Mon-Fri)
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 2, 2, 50000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(5m, result.ActualLeaveDays);
        Assert.Equal(3m, result.LeaveLOPDays);
    }

    [Fact]
    public void TestCase11_MonthlySalary50000_Lop2_VerifyCurrencyRounding()
    {
        // Test Case 11: Monthly Salary = ₹50,000, LOP Days = 2
        // Daily Salary = 50000 / 31 = 1612.903225...
        // LOP Amount = 2 * 1612.903225... = 3225.80645... rounded to 3225.81
        // Actual Salary = 50000 - 3225.81 = 46774.19
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(empId, new DateTime(2026, 8, 3), new DateTime(2026, 8, 5)) // 3 working days -> Allowed 1 => LOP = 2
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 50000m, calendar, leaves, new List<AttendanceLog>());

        Assert.Equal(2m, result.LeaveLOPDays);
        Assert.Equal(1612.9032m, Math.Round(result.DailySalary, 4));
        Assert.Equal(3225.81m, result.TotalLOPAmount);
        Assert.Equal(46774.19m, result.ActualSalary);
    }

    [Fact]
    public void TestCase12_TwoUnpermissionedLateLogins_LateLopHalfDay()
    {
        // Test Case 12: Two unpermissioned late logins => Existing half-day LOP = 0.5
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var logs = new List<AttendanceLog>
        {
            new AttendanceLog { EmployeeId = empId, LoginTime = new DateTime(2026, 8, 3, 10, 30, 0, DateTimeKind.Utc), IsLate = true, IsPermission = false },
            new AttendanceLog { EmployeeId = empId, LoginTime = new DateTime(2026, 8, 4, 10, 25, 0, DateTimeKind.Utc), IsLate = true, IsPermission = false }
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, new List<LeaveRequest>(), logs);

        Assert.Equal(2, result.UnpermissionedLateCount);
        Assert.Equal(0.5m, result.LateLoginLOPDays);
        Assert.Equal(0.5m, result.TotalLOPDays);
    }

    [Fact]
    public void TestCase13_LateLoginMarkedAsPermission_LateLopRemoved()
    {
        // Test Case 13: Late login marked as Permission => Late login LOP removed
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        var logs = new List<AttendanceLog>
        {
            new AttendanceLog { EmployeeId = empId, LoginTime = new DateTime(2026, 8, 3, 10, 30, 0, DateTimeKind.Utc), IsLate = true, IsPermission = true }, // Permission!
            new AttendanceLog { EmployeeId = empId, LoginTime = new DateTime(2026, 8, 4, 10, 25, 0, DateTimeKind.Utc), IsLate = true, IsPermission = false }
        };

        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 40000m, calendar, new List<LeaveRequest>(), logs);

        Assert.Equal(1, result.UnpermissionedLateCount);
        Assert.Equal(0.0m, result.LateLoginLOPDays);
        Assert.Equal(0.0m, result.TotalLOPDays);
    }

    [Fact]
    public void TestCase14_WeekendHoliday_MustNeverIndependentlyCreateLop()
    {
        // Test Case 14: Weekend/Holiday must never independently create LOP
        int empId = 1;
        var calendar = CreateAugust2026Calendar();
        // Set all weekends and holidays as non-working with no employee login
        var result = LeaveLopCalculator.Calculate(empId, 2026, 8, 1, 2, 50000m, calendar, new List<LeaveRequest>(), new List<AttendanceLog>());

        var nonWorkingDays = result.DailyDetails.Where(d => !d.IsWorkingDay).ToList();
        Assert.All(nonWorkingDays, d => Assert.False(d.IsLop));
        Assert.Equal(0m, result.TotalLOPDays);
    }

    [Fact]
    public void TestCase15_Employee1Data_NeverAffectsEmployee2()
    {
        // Test Case 15: Employee 1 leave/salary must never affect Employee 2
        var calendar = CreateAugust2026Calendar();

        var emp1Leaves = new List<LeaveRequest>
        {
            CreateApprovedLeave(1, new DateTime(2026, 8, 3), new DateTime(2026, 8, 7)) // Emp 1 has 5 days leave
        };

        var emp2Leaves = new List<LeaveRequest>(); // Emp 2 has 0 leaves

        var resEmp1 = LeaveLopCalculator.Calculate(1, 2026, 8, 1, 2, 40000m, calendar, emp1Leaves, new List<AttendanceLog>());
        var resEmp2 = LeaveLopCalculator.Calculate(2, 2026, 8, 1, 2, 60000m, calendar, emp2Leaves, new List<AttendanceLog>());

        Assert.Equal(5m, resEmp1.ActualLeaveDays);
        Assert.Equal(4m, resEmp1.LeaveLOPDays);

        Assert.Equal(0m, resEmp2.ActualLeaveDays);
        Assert.Equal(0m, resEmp2.LeaveLOPDays);
        Assert.Equal(0m, resEmp2.TotalLOPAmount);
    }
}
