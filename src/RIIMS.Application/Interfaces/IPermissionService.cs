using RIIMS.Application.DTOs.Permission;

namespace RIIMS.Application.Interfaces;

public interface IPermissionService
{
    Task<PermissionRequestDto> SubmitPermissionAsync(int employeeId, CreatePermissionRequest request);
    Task<List<PermissionRequestDto>> GetEmployeePermissionsAsync(int employeeId);
    Task<List<PermissionRequestDto>> GetPendingApprovalsAsync(int currentEmployeeId, bool isAdmin);
    Task ApprovePermissionAsync(int permissionRequestId, int approverEmployeeId);
    Task RejectPermissionAsync(int permissionRequestId, int approverEmployeeId);
}
