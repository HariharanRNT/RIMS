using RIIMS.Application.DTOs.Payroll;

namespace RIIMS.Application.Interfaces;

public interface ISalaryStructureService
{
    SalaryPreviewResponseDto CalculateSalaryPreview(SalaryPreviewRequestDto request);
    Task<SalaryStructureResponseDto> CreateOrUpdateSalaryStructureAsync(int employeeId, CreateSalaryStructureDto dto);
    Task<SalaryStructureResponseDto?> GetActiveSalaryStructureAsync(int employeeId, DateTime? forDate = null);
    Task<List<SalaryStructureResponseDto>> GetSalaryHistoryAsync(int employeeId);
}
