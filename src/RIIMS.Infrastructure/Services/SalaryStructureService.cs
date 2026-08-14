using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class SalaryStructureService : ISalaryStructureService
{
    private readonly RiimsDbContext _context;

    public SalaryStructureService(RiimsDbContext context)
    {
        _context = context;
    }

    public SalaryPreviewResponseDto CalculateSalaryPreview(SalaryPreviewRequestDto request)
    {
        if (request.AnnualCTC < 0)
        {
            throw new ArgumentException("Annual CTC cannot be negative.");
        }

        if (request.Components != null)
        {
            foreach (var c in request.Components)
            {
                if (c.Percentage.HasValue && c.Percentage.Value < 0)
                {
                    throw new InvalidOperationException($"{c.ComponentName} percentage cannot be negative.");
                }
                if (c.FixedAmount.HasValue && c.FixedAmount.Value < 0)
                {
                    throw new InvalidOperationException($"{c.ComponentName} fixed amount cannot be negative.");
                }
            }
        }

        var monthlyCTC = Math.Round(request.AnnualCTC / 12m, 2);
        var preview = new SalaryPreviewResponseDto
        {
            AnnualCTC = request.AnnualCTC,
            MonthlyCTC = monthlyCTC
        };

        if (request.SalaryConfigurationMode == SalaryConfigurationMode.ConfigureLater || request.Components == null || !request.Components.Any())
        {
            return preview;
        }

        var processedComponents = new List<SalaryComponentDto>();
        decimal totalEarnings = 0m;
        decimal totalDeductions = 0m;
        decimal totalEmployerContributions = 0m;

        SalaryComponentDto? autoBalanceComp = null;

        // 1. Process explicit non-auto-balance earnings first
        foreach (var c in request.Components.Where(x => x.IsEarning && x.CalculationType != SalaryCalculationType.AutomaticBalance))
        {
            decimal monthlyAmt = CalculateComponentMonthlyAmount(c, monthlyCTC, processedComponents);
            var copy = CloneComponentWithAmount(c, monthlyAmt);
            processedComponents.Add(copy);
            totalEarnings += monthlyAmt;
        }

        // 2. Handle Automatic Balance (Special Allowance)
        autoBalanceComp = request.Components.FirstOrDefault(x => x.IsEarning && x.CalculationType == SalaryCalculationType.AutomaticBalance);
        if (autoBalanceComp != null)
        {
            decimal remainingBalance = monthlyCTC - totalEarnings;
            if (remainingBalance < 0)
            {
                throw new InvalidOperationException($"Configured earnings exceed Monthly CTC by ₹{Math.Abs(remainingBalance):N2}. Automatic balance cannot be negative.");
            }
            decimal monthlyAmt = Math.Round(remainingBalance, 2);
            var copy = CloneComponentWithAmount(autoBalanceComp, monthlyAmt);
            processedComponents.Add(copy);
            totalEarnings += monthlyAmt;
        }

        // 3. Process Employee Deductions & Employer Contributions
        foreach (var c in request.Components.Where(x => !x.IsEarning))
        {
            // Skip disabled PF/ESI/PT/TDS
            if (c.ComponentType == SalaryComponentType.PF && !request.PFApplicable) continue;
            if (c.ComponentType == SalaryComponentType.ESI && !request.ESIApplicable) continue;
            if (c.ComponentType == SalaryComponentType.ProfessionalTax && !request.ProfessionalTaxApplicable) continue;
            if (c.ComponentType == SalaryComponentType.TDS && !request.TDSApplicable) continue;

            decimal monthlyAmt = CalculateComponentMonthlyAmount(c, monthlyCTC, processedComponents);
            var copy = CloneComponentWithAmount(c, monthlyAmt);
            processedComponents.Add(copy);

            if (c.IsEmployerContribution)
            {
                totalEmployerContributions += monthlyAmt;
            }
            else if (c.IsDeduction)
            {
                totalDeductions += monthlyAmt;
            }
        }

        preview.GrossEarnings = Math.Round(totalEarnings, 2);
        preview.TotalDeductions = Math.Round(totalDeductions, 2);
        preview.TotalEmployerContributions = Math.Round(totalEmployerContributions, 2);
        preview.EstimatedNetPay = Math.Max(0, preview.GrossEarnings - preview.TotalDeductions);
        preview.Components = processedComponents;

        return preview;
    }

    public async Task<SalaryStructureResponseDto> CreateOrUpdateSalaryStructureAsync(int employeeId, CreateSalaryStructureDto dto)
    {
        var employee = await _context.Employees.FindAsync(employeeId);
        if (employee == null)
        {
            throw new KeyNotFoundException($"Employee with ID {employeeId} not found.");
        }

        if (dto.AnnualCTC < 0)
        {
            throw new ArgumentException("Annual CTC cannot be negative.");
        }

        var effectiveFrom = dto.EffectiveFrom ?? DateTime.UtcNow.Date;

        // Preview & Validate calculation
        var preview = CalculateSalaryPreview(new SalaryPreviewRequestDto
        {
            AnnualCTC = dto.AnnualCTC,
            SalaryConfigurationMode = dto.SalaryConfigurationMode,
            PFApplicable = dto.PFApplicable,
            ESIApplicable = dto.ESIApplicable,
            ProfessionalTaxApplicable = dto.ProfessionalTaxApplicable,
            TDSApplicable = dto.TDSApplicable,
            Components = dto.Components
        });

        // Deactivate active existing structure
        var activeStructures = await _context.EmployeeSalaryStructures
            .Where(s => s.EmployeeId == employeeId && s.IsActive)
            .ToListAsync();

        foreach (var active in activeStructures)
        {
            active.IsActive = false;
            active.EffectiveTo = effectiveFrom.AddDays(-1);
            active.UpdatedAt = DateTime.UtcNow;
        }

        var newStructure = new EmployeeSalaryStructure
        {
            EmployeeId = employeeId,
            AnnualCTC = dto.AnnualCTC,
            MonthlyCTC = preview.MonthlyCTC,
            SalaryConfigurationMode = dto.SalaryConfigurationMode,
            EffectiveFrom = effectiveFrom,
            EffectiveTo = null,
            IsActive = true,
            PFApplicable = dto.PFApplicable,
            ESIApplicable = dto.ESIApplicable,
            ProfessionalTaxApplicable = dto.ProfessionalTaxApplicable,
            TDSApplicable = dto.TDSApplicable,
            CreatedAt = DateTime.UtcNow
        };

        _context.EmployeeSalaryStructures.Add(newStructure);
        await _context.SaveChangesAsync();

        if (dto.SalaryConfigurationMode == SalaryConfigurationMode.ConfigureNow && preview.Components.Any())
        {
            foreach (var comp in preview.Components)
            {
                _context.SalaryComponents.Add(new SalaryComponent
                {
                    SalaryStructureId = newStructure.Id,
                    ComponentName = comp.ComponentName,
                    ComponentType = comp.ComponentType,
                    CalculationType = comp.CalculationType,
                    Percentage = comp.Percentage,
                    FixedAmount = comp.FixedAmount,
                    CalculationBase = comp.CalculationBase,
                    MonthlyAmount = comp.MonthlyAmount,
                    IsEarning = comp.IsEarning,
                    IsDeduction = comp.IsDeduction,
                    IsEmployerContribution = comp.IsEmployerContribution,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _context.SaveChangesAsync();
        }

        return await MapToResponseDtoAsync(newStructure.Id);
    }

    public async Task<SalaryStructureResponseDto?> GetActiveSalaryStructureAsync(int employeeId, DateTime? forDate = null)
    {
        var targetDate = forDate ?? DateTime.UtcNow.Date;

        var structure = await _context.EmployeeSalaryStructures
            .Include(s => s.Components)
            .Where(s => s.EmployeeId == employeeId && s.EffectiveFrom <= targetDate && (s.EffectiveTo == null || s.EffectiveTo >= targetDate))
            .OrderByDescending(s => s.EffectiveFrom)
            .FirstOrDefaultAsync();

        if (structure == null)
        {
            // Fallback to latest active if available
            structure = await _context.EmployeeSalaryStructures
                .Include(s => s.Components)
                .Where(s => s.EmployeeId == employeeId && s.IsActive)
                .OrderByDescending(s => s.EffectiveFrom)
                .FirstOrDefaultAsync();
        }

        if (structure == null) return null;

        return MapStructureEntityToResponse(structure);
    }

    public async Task<List<SalaryStructureResponseDto>> GetSalaryHistoryAsync(int employeeId)
    {
        var list = await _context.EmployeeSalaryStructures
            .Include(s => s.Components)
            .Where(s => s.EmployeeId == employeeId)
            .OrderByDescending(s => s.EffectiveFrom)
            .ToListAsync();

        return list.Select(MapStructureEntityToResponse).ToList();
    }

    private async Task<SalaryStructureResponseDto> MapToResponseDtoAsync(int structureId)
    {
        var structure = await _context.EmployeeSalaryStructures
            .Include(s => s.Components)
            .FirstAsync(s => s.Id == structureId);

        return MapStructureEntityToResponse(structure);
    }

    private static SalaryStructureResponseDto MapStructureEntityToResponse(EmployeeSalaryStructure s)
    {
        var comps = s.Components.Select(c => new SalaryComponentDto
        {
            Id = c.Id,
            ComponentName = c.ComponentName,
            ComponentType = c.ComponentType,
            CalculationType = c.CalculationType,
            Percentage = c.Percentage,
            FixedAmount = c.FixedAmount,
            CalculationBase = c.CalculationBase,
            MonthlyAmount = c.MonthlyAmount,
            IsEarning = c.IsEarning,
            IsDeduction = c.IsDeduction,
            IsEmployerContribution = c.IsEmployerContribution
        }).ToList();

        decimal grossEarnings = comps.Where(c => c.IsEarning).Sum(c => c.MonthlyAmount);
        decimal totalDeductions = comps.Where(c => c.IsDeduction && !c.IsEmployerContribution).Sum(c => c.MonthlyAmount);
        decimal totalEmployer = comps.Where(c => c.IsEmployerContribution).Sum(c => c.MonthlyAmount);

        return new SalaryStructureResponseDto
        {
            Id = s.Id,
            EmployeeId = s.EmployeeId,
            AnnualCTC = s.AnnualCTC,
            MonthlyCTC = s.MonthlyCTC,
            SalaryConfigurationMode = s.SalaryConfigurationMode,
            EffectiveFrom = s.EffectiveFrom,
            EffectiveTo = s.EffectiveTo,
            IsActive = s.IsActive,
            PFApplicable = s.PFApplicable,
            ESIApplicable = s.ESIApplicable,
            ProfessionalTaxApplicable = s.ProfessionalTaxApplicable,
            TDSApplicable = s.TDSApplicable,
            GrossEarnings = Math.Round(grossEarnings, 2),
            TotalDeductions = Math.Round(totalDeductions, 2),
            TotalEmployerContributions = Math.Round(totalEmployer, 2),
            EstimatedNetPay = Math.Max(0, Math.Round(grossEarnings - totalDeductions, 2)),
            Components = comps
        };
    }

    private static decimal CalculateComponentMonthlyAmount(SalaryComponentDto c, decimal monthlyCTC, List<SalaryComponentDto> alreadyProcessed)
    {
        if (c.CalculationType == SalaryCalculationType.FixedAmount)
        {
            return Math.Round(c.FixedAmount ?? 0m, 2);
        }

        if (c.CalculationType == SalaryCalculationType.Percentage)
        {
            decimal pct = (c.Percentage ?? 0m) / 100m;
            decimal baseAmt = monthlyCTC;

            if (c.CalculationBase == SalaryCalculationBase.BasicSalary)
            {
                var basicComp = alreadyProcessed.FirstOrDefault(x => x.ComponentType == SalaryComponentType.BasicSalary);
                baseAmt = basicComp?.MonthlyAmount ?? (monthlyCTC * 0.50m);
            }
            else if (c.CalculationBase == SalaryCalculationBase.BasicPlusDA)
            {
                var basicComp = alreadyProcessed.FirstOrDefault(x => x.ComponentType == SalaryComponentType.BasicSalary);
                baseAmt = basicComp?.MonthlyAmount ?? (monthlyCTC * 0.50m);
            }

            return Math.Round(baseAmt * pct, 2);
        }

        return 0m;
    }

    private static SalaryComponentDto CloneComponentWithAmount(SalaryComponentDto c, decimal amount)
    {
        return new SalaryComponentDto
        {
            Id = c.Id,
            ComponentName = c.ComponentName,
            ComponentType = c.ComponentType,
            CalculationType = c.CalculationType,
            Percentage = c.Percentage,
            FixedAmount = c.FixedAmount,
            CalculationBase = c.CalculationBase,
            MonthlyAmount = Math.Round(amount, 2),
            IsEarning = c.IsEarning,
            IsDeduction = c.IsDeduction,
            IsEmployerContribution = c.IsEmployerContribution
        };
    }
}
