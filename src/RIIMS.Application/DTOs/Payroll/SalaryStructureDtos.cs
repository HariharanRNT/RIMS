using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.Payroll;

public class SalaryComponentDto
{
    public int? Id { get; set; }
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
}

public class CreateSalaryStructureDto
{
    public decimal AnnualCTC { get; set; }
    public SalaryConfigurationMode SalaryConfigurationMode { get; set; } = SalaryConfigurationMode.ConfigureLater;
    public DateTime? EffectiveFrom { get; set; }
    public bool PFApplicable { get; set; } = true;
    public bool ESIApplicable { get; set; } = false;
    public bool ProfessionalTaxApplicable { get; set; } = false;
    public bool TDSApplicable { get; set; } = false;
    public List<SalaryComponentDto> Components { get; set; } = new();
}

public class SalaryStructureResponseDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public decimal AnnualCTC { get; set; }
    public decimal MonthlyCTC { get; set; }
    public SalaryConfigurationMode SalaryConfigurationMode { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public bool IsActive { get; set; }
    public bool PFApplicable { get; set; }
    public bool ESIApplicable { get; set; }
    public bool ProfessionalTaxApplicable { get; set; }
    public bool TDSApplicable { get; set; }
    public decimal GrossEarnings { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal TotalEmployerContributions { get; set; }
    public decimal EstimatedNetPay { get; set; }
    public List<SalaryComponentDto> Components { get; set; } = new();
}

public class SalaryPreviewRequestDto
{
    public decimal AnnualCTC { get; set; }
    public SalaryConfigurationMode SalaryConfigurationMode { get; set; } = SalaryConfigurationMode.ConfigureLater;
    public bool PFApplicable { get; set; } = true;
    public bool ESIApplicable { get; set; } = false;
    public bool ProfessionalTaxApplicable { get; set; } = false;
    public bool TDSApplicable { get; set; } = false;
    public List<SalaryComponentDto> Components { get; set; } = new();
}

public class SalaryPreviewResponseDto
{
    public decimal AnnualCTC { get; set; }
    public decimal MonthlyCTC { get; set; }
    public decimal GrossEarnings { get; set; }
    public decimal TotalDeductions { get; set; }
    public decimal TotalEmployerContributions { get; set; }
    public decimal EstimatedNetPay { get; set; }
    public List<SalaryComponentDto> Components { get; set; } = new();
}
