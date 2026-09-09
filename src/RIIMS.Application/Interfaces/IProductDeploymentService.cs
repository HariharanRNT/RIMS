using RIIMS.Application.Common;
using RIIMS.Application.DTOs.ProductDeployment;

namespace RIIMS.Application.Interfaces;

public interface IProductDeploymentService
{
    Task<PagedResult<ProductDeploymentDto>> GetDeploymentsAsync(int currentUserId, ProductDeploymentFilter filter);
    Task<ProductDeploymentDto?> GetDeploymentByIdAsync(int currentUserId, int id);
    Task<ProductDeploymentDto> CreateDeploymentAsync(int currentUserId, CreateProductDeploymentRequest request);
    Task<ProductDeploymentDto> UpdateDeploymentAsync(int currentUserId, int id, UpdateProductDeploymentRequest request);
    Task<ProductDeploymentDto> ChangeStatusAsync(int currentUserId, int id, ChangeDeploymentStatusRequest request);
    Task<List<ProductDeploymentActivityDto>> GetActivitiesAsync(int currentUserId, int deploymentId);
    Task<byte[]> ExportToExcelAsync(int currentUserId, ProductDeploymentFilter filter);
    Task<List<AuthorizedProductOptionDto>> GetAuthorizedProductsAndClientsAsync(int currentUserId);
    Task<List<EmployeeProductAccessDto>> GetEmployeeProductAccessListAsync();
    Task<EmployeeProductAccessDto> UpdateEmployeeProductAccessAsync(UpdateEmployeeProductAccessRequest request, int currentUserId);
}
