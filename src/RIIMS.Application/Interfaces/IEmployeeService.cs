using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Employee;

namespace RIIMS.Application.Interfaces;

public interface IEmployeeService
{
    Task<PagedResult<EmployeeListDto>> GetAllAsync(int page, int pageSize, int? departmentId = null, string? search = null);
    Task<EmployeeDto?> GetByIdAsync(int id);
    Task<EmployeeDto?> GetMyProfileAsync(int employeeId, int? userId = null);
    Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, int createdBy);
    Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request);
    Task DeleteAsync(int id);
    Task<EmployeeWorkDetailDto?> GetWorkDetailAsync(int employeeId);
    Task<EmployeeWorkDetailDto> UpdateWorkDetailAsync(int employeeId, UpdateWorkDetailRequest request);
}
