using RIIMS.Application.DTOs.Designation;

namespace RIIMS.Application.Interfaces;

public interface IDesignationService
{
    Task<List<DesignationDto>> GetAllAsync();
    Task<DesignationDto?> GetByIdAsync(int id);
    Task<DesignationDto> CreateAsync(CreateDesignationRequest request);
    Task<DesignationDto> UpdateAsync(int id, UpdateDesignationRequest request);
    Task DeleteAsync(int id);
}
