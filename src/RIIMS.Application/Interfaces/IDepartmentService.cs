using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Department;

namespace RIIMS.Application.Interfaces;

public interface IDepartmentService
{
    Task<List<DepartmentDto>> GetAllAsync();
    Task<DepartmentDto?> GetByIdAsync(int id);
    Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request);
    Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentRequest request);
    Task DeleteAsync(int id);
}
