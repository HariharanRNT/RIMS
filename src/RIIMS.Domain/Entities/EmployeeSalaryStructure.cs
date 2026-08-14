using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;

namespace RIIMS.Domain.Entities;

public class EmployeeSalaryStructure : BaseEntity
{
    public int EmployeeId { get; set; }
    public decimal AnnualCTC { get; set; }
    public decimal MonthlyCTC { get; set; }
    public SalaryConfigurationMode SalaryConfigurationMode { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool PFApplicable { get; set; } = true;
    public bool ESIApplicable { get; set; } = false;
    public bool ProfessionalTaxApplicable { get; set; } = false;
    public bool TDSApplicable { get; set; } = false;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public ICollection<SalaryComponent> Components { get; set; } = new List<SalaryComponent>();
}
