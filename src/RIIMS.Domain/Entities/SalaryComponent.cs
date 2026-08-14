using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;

namespace RIIMS.Domain.Entities;

public class SalaryComponent : BaseEntity
{
    public int SalaryStructureId { get; set; }
    public string ComponentName { get; set; } = string.Empty;
    public SalaryComponentType ComponentType { get; set; }
    public SalaryCalculationType CalculationType { get; set; }
    public decimal? Percentage { get; set; }
    public decimal? FixedAmount { get; set; }
    public SalaryCalculationBase? CalculationBase { get; set; }
    public decimal MonthlyAmount { get; set; }
    public bool IsEarning { get; set; } = true;
    public bool IsDeduction { get; set; } = false;
    public bool IsEmployerContribution { get; set; } = false;

    // Navigation
    public EmployeeSalaryStructure SalaryStructure { get; set; } = null!;
}
