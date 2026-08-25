using RIIMS.Application.DTOs.Permission;
using RIIMS.Application.DTOs.Role;
using RIIMS.Application.DTOs.User;

namespace RIIMS.Application.Interfaces;

public interface IPermissionManagementService
{
    // Permission Evaluation
    Task<List<string>> GetUserPermissionCodesAsync(int userId);
    Task<bool> HasPermissionAsync(int userId, string permissionCode);

    // Permission Master Data
    Task<List<AppPermissionDto>> GetAllPermissionsAsync();
    Task<List<ModulePermissionsDto>> GetPermissionsGroupedByModuleAsync();

    // Role Management
    Task<List<RoleDto>> GetAllRolesAsync();
    Task<RoleDto?> GetRoleByIdAsync(int roleId);
    Task<RoleDto> CreateRoleAsync(CreateRoleRequest request, int currentUserId);
    Task<RoleDto> UpdateRoleAsync(int roleId, UpdateRoleRequest request, int currentUserId);
    Task DeleteRoleAsync(int roleId, int currentUserId);
    Task<RolePermissionsDto> GetRolePermissionsAsync(int roleId);
    Task<RolePermissionsDto> UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsRequest request, int currentUserId);

    // Admin User Management
    Task<List<UserDto>> GetAllUsersAsync();
    Task<UserDto?> GetUserByIdAsync(int userId);
    Task<UserDto> CreateAdminUserAsync(CreateUserRequest request, int currentUserId, bool isCurrentSuperAdmin);
    Task<UserDto> UpdateAdminUserAsync(int userId, UpdateUserRequest request, int currentUserId, bool isCurrentSuperAdmin);
    Task SetUserActiveStatusAsync(int userId, bool isActive, int currentUserId);
    Task AdminResetPasswordAsync(int userId, AdminResetPasswordRequest request, int currentUserId);
}
