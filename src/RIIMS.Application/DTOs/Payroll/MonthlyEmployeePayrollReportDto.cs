namespace RIIMS.Application.DTOs.Payroll;

public class MonthlyEmployeePayrollReportDto
{
    public int EmployeeId { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string EmployeeName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Designation { get; set; }

    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public string PayrollStatus { get; set; } = "Pending / Live Preview";

    public decimal WorkingDays { get; set; }
    public decimal PresentDays { get; set; }
    public decimal ApprovedLeaveDays { get; set; }
    public int MonthlyAllowedLeave { get; set; }

    public decimal SandwichLeaveDays { get; set; }
    public decimal WeekendDays { get; set; }
    public decimal HolidayDays { get; set; }

    public int PermissionCount { get; set; }
    public int LateLoginCount { get; set; }

    public decimal LateLoginLOPDays { get; set; }
    public decimal LeaveLOPDays { get; set; }
    public decimal TotalLOPDays { get; set; }

    public decimal MonthlySalary { get; set; }
    public decimal DailySalary { get; set; }
    public decimal LOPAmount { get; set; }

    public decimal TotalDeduction { get; set; }
    public decimal FinalSalary { get; set; }
}
