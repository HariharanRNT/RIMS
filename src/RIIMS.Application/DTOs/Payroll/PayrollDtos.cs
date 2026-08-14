namespace RIIMS.Application.DTOs.Payroll;

public class ProcessPayrollRequest
{
    public int Month { get; set; }
    public int Year { get; set; }
}

public class PayslipDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public DateTime DateOfJoining { get; set; }
    public string PanNumber { get; set; } = string.Empty;
    public string PfNumber { get; set; } = string.Empty;
    public string EsiNumber { get; set; } = string.Empty;
    public string AadhaarNumber { get; set; } = string.Empty;
    public string BankName { get; set; } = string.Empty;
    public string BankAccountNumber { get; set; } = string.Empty;
    public int Month { get; set; }
    public int Year { get; set; }

    // Salary Details (Earnings)
    public decimal BasicPay { get; set; }
    public decimal Hra { get; set; }
    public decimal Conveyance { get; set; }
    public decimal Medical { get; set; }
    public decimal Allowances { get; set; }
    public decimal Arrears { get; set; }
    public decimal TotalSalary { get; set; }

    // Deductions
    public decimal LopDeduction { get; set; }
    public decimal Esi { get; set; }
    public decimal Pf { get; set; }
    public decimal ParkingCharges { get; set; }
    public decimal Tds { get; set; }
    public decimal TotalDeduction { get; set; }

    // Net Salary
    public decimal NetPay { get; set; }

    // Attendance Snapshot
    public decimal LOPDays { get; set; }
    public int LeavesTaken { get; set; }
    public int PermissionsUsed { get; set; }
    public int GraceViolations { get; set; }

    // Detailed LOP Breakdown
    public int MonthlyAllowedLeave { get; set; }
    public decimal ActualLeaveDays { get; set; }
    public decimal SandwichLeaveDays { get; set; }
    public decimal LeaveLOPDays { get; set; }
    public decimal LateLoginLOPDays { get; set; }
    public decimal DailySalary { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PayrollSummaryDto
{
    public int Month { get; set; }
    public int Year { get; set; }
    public int TotalEmployees { get; set; }
    public decimal TotalBasicPay { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal TotalNetPay { get; set; }
    public List<PayslipDto> Payslips { get; set; } = new();
}
