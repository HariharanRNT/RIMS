using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class PayslipDetail : BaseEntity
{
    public int EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }

    // Salary Earnings Components
    public decimal BasicPay { get; set; }
    public decimal Hra { get; set; }
    public decimal Conveyance { get; set; }
    public decimal Medical { get; set; }
    public decimal Allowances { get; set; }
    public decimal Arrears { get; set; }
    public decimal TotalSalary { get; set; }

    // Deductions Components
    public decimal LopDeduction { get; set; }
    public decimal Esi { get; set; }
    public decimal Pf { get; set; }
    public decimal ParkingCharges { get; set; }
    public decimal Tds { get; set; }
    public decimal TotalDeduction { get; set; }

    // Net Payable
    public decimal NetPay { get; set; }

    // Audit Info
    public decimal LOPDays { get; set; }
    public int LeavesTaken { get; set; }
    public int PermissionsUsed { get; set; }
    public int GraceViolations { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
