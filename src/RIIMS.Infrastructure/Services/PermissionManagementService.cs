using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Permission;
using RIIMS.Application.DTOs.Role;
using RIIMS.Application.DTOs.User;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Services;

public class PermissionManagementService : IPermissionManagementService
{
    private readonly RiimsDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;

    public PermissionManagementService(
        RiimsDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<List<string>> GetUserPermissionCodesAsync(int userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || !user.IsActive)
        {
            return new List<string>();
        }

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) || roles.Contains("Admin", StringComparer.OrdinalIgnoreCase))
        {
            return await _context.Permissions
                .Where(p => p.IsActive)
                .Select(p => p.Code)
                .ToListAsync();
        }

        var roleEntities = await _roleManager.Roles
            .Where(r => r.IsActive && roles.Contains(r.Name!))
            .ToListAsync();

        var roleIds = roleEntities.Select(r => r.Id).ToList();

        var permissionCodes = await _context.RolePermissions
            .Where(rp => roleIds.Contains(rp.RoleId))
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync();

        return permissionCodes;
    }

    public async Task<bool> HasPermissionAsync(int userId, string permissionCode)
    {
        var permissions = await GetUserPermissionCodesAsync(userId);
        return permissions.Contains(permissionCode, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<List<AppPermissionDto>> GetAllPermissionsAsync()
    {
        return await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Name)
            .Select(p => new AppPermissionDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Module = p.Module,
                Description = p.Description
            })
            .ToListAsync();
    }

    public async Task<List<ModulePermissionsDto>> GetPermissionsGroupedByModuleAsync()
    {
        var allPermissions = await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Name)
            .ToListAsync();

        return allPermissions
            .GroupBy(p => p.Module)
            .Select(g => new ModulePermissionsDto
            {
                Module = g.Key,
                Permissions = g.Select(p => new AppPermissionDto
                {
                    Id = p.Id,
                    Code = p.Code,
                    Name = p.Name,
                    Module = p.Module,
                    Description = p.Description
                }).ToList()
            })
            .OrderBy(m => m.Module)
            .ToList();
    }

    public async Task<List<RoleDto>> GetAllRolesAsync()
    {
        var roles = await _roleManager.Roles.ToListAsync();
        var roleDtos = new List<RoleDto>();

        foreach (var role in roles)
        {
            var userCount = (await _userManager.GetUsersInRoleAsync(role.Name!)).Count;
            var permCount = await _context.RolePermissions.CountAsync(rp => rp.RoleId == role.Id);

            roleDtos.Add(new RoleDto
            {
                Id = role.Id,
                Name = role.Name!,
                Description = role.Description,
                IsSystemRole = role.IsSystemRole,
                IsProtected = role.IsProtected,
                IsActive = role.IsActive,
                UsersCount = userCount,
                PermissionsCount = role.Name == "Super Admin"
                    ? await _context.Permissions.CountAsync(p => p.IsActive)
                    : permCount,
                CreatedAt = role.CreatedAt,
                UpdatedAt = role.UpdatedAt
            });
        }

        return roleDtos.OrderBy(r => r.IsSystemRole ? 0 : 1).ThenBy(r => r.Name).ToList();
    }

    public async Task<RoleDto?> GetRoleByIdAsync(int roleId)
    {
        var role = await _roleManager.FindByIdAsync(roleId.ToString());
        if (role == null) return null;

        var userCount = (await _userManager.GetUsersInRoleAsync(role.Name!)).Count;
        var permCount = await _context.RolePermissions.CountAsync(rp => rp.RoleId == role.Id);

        return new RoleDto
        {
            Id = role.Id,
            Name = role.Name!,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            IsProtected = role.IsProtected,
            IsActive = role.IsActive,
            UsersCount = userCount,
            PermissionsCount = role.Name == "Super Admin"
                ? await _context.Permissions.CountAsync(p => p.IsActive)
                : permCount,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt
        };
    }

    public async Task<RoleDto> CreateRoleAsync(CreateRoleRequest request, int currentUserId)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Role name cannot be empty.");

        if (await _roleManager.RoleExistsAsync(request.Name.Trim()))
            throw new InvalidOperationException($"Role '{request.Name}' already exists.");

        var role = new ApplicationRole
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IsSystemRole = false,
            IsProtected = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await _roleManager.CreateAsync(role);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        if (request.PermissionCodes != null && request.PermissionCodes.Any())
        {
            var permissions = await _context.Permissions
                .Where(p => request.PermissionCodes.Contains(p.Code))
                .ToListAsync();

            foreach (var perm in permissions)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = perm.Id
                });
            }
            await contextSaveAndAuditAsync(currentUserId, "RoleCreated", "AspNetRoles", role.Id, $"Created role '{role.Name}' with {permissions.Count} permissions.");
        }
        else
        {
            await contextSaveAndAuditAsync(currentUserId, "RoleCreated", "AspNetRoles", role.Id, $"Created role '{role.Name}'.");
        }

        return (await GetRoleByIdAsync(role.Id))!;
    }

    public async Task<RoleDto> UpdateRoleAsync(int roleId, UpdateRoleRequest request, int currentUserId)
    {
        var role = await _roleManager.FindByIdAsync(roleId.ToString());
        if (role == null)
            throw new KeyNotFoundException($"Role with ID {roleId} not found.");

        if (role.IsProtected && !string.Equals(role.Name, request.Name?.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"System protected role '{role.Name}' cannot be renamed.");

        if (!string.IsNullOrWhiteSpace(request.Name) && !string.Equals(role.Name, request.Name.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            if (await _roleManager.RoleExistsAsync(request.Name.Trim()))
                throw new InvalidOperationException($"Role name '{request.Name}' is already in use.");
            role.Name = request.Name.Trim();
        }

        role.Description = request.Description?.Trim();
        role.UpdatedAt = DateTime.UtcNow;

        var result = await _roleManager.UpdateAsync(role);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        await contextSaveAndAuditAsync(currentUserId, "RoleUpdated", "AspNetRoles", role.Id, $"Updated details for role '{role.Name}'.");

        return (await GetRoleByIdAsync(role.Id))!;
    }

    public async Task DeleteRoleAsync(int roleId, int currentUserId)
    {
        var role = await _roleManager.FindByIdAsync(roleId.ToString());
        if (role == null)
            throw new KeyNotFoundException($"Role with ID {roleId} not found.");

        if (role.IsProtected || role.IsSystemRole)
            throw new InvalidOperationException($"Protected or system role '{role.Name}' cannot be deleted.");

        var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
        if (usersInRole.Any())
            throw new InvalidOperationException($"Cannot delete role '{role.Name}' because it is assigned to {usersInRole.Count} user(s).");

        var rolePermissions = await _context.RolePermissions.Where(rp => rp.RoleId == role.Id).ToListAsync();
        _context.RolePermissions.RemoveRange(rolePermissions);

        var result = await _roleManager.DeleteAsync(role);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description)));

        await contextSaveAndAuditAsync(currentUserId, "RoleDeleted", "AspNetRoles", roleId, $"Deleted role '{role.Name}'.");
    }

    public async Task<RolePermissionsDto> GetRolePermissionsAsync(int roleId)
    {
        var role = await _roleManager.FindByIdAsync(roleId.ToString());
        if (role == null)
            throw new KeyNotFoundException($"Role with ID {roleId} not found.");

        List<string> permCodes;
        if (role.Name == "Super Admin")
        {
            permCodes = await _context.Permissions.Where(p => p.IsActive).Select(p => p.Code).ToListAsync();
        }
        else
        {
            permCodes = await _context.RolePermissions
                .Where(rp => rp.RoleId == role.Id)
                .Select(rp => rp.Permission.Code)
                .ToListAsync();
        }

        return new RolePermissionsDto
        {
            RoleId = role.Id,
            RoleName = role.Name!,
            Description = role.Description,
            IsSystemRole = role.IsSystemRole,
            IsProtected = role.IsProtected,
            AssignedPermissionCodes = permCodes
        };
    }

    public async Task<RolePermissionsDto> UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsRequest request, int currentUserId)
    {
        var role = await _roleManager.FindByIdAsync(roleId.ToString());
        if (role == null)
            throw new KeyNotFoundException($"Role with ID {roleId} not found.");

        if (role.Name == "Super Admin")
            throw new InvalidOperationException("Super Admin permissions cannot be modified; Super Admin has full unrestricted access.");

        var existingRolePerms = await _context.RolePermissions
            .Where(rp => rp.RoleId == role.Id)
            .ToListAsync();

        _context.RolePermissions.RemoveRange(existingRolePerms);

        if (request.PermissionCodes != null && request.PermissionCodes.Any())
        {
            var permissions = await _context.Permissions
                .Where(p => request.PermissionCodes.Contains(p.Code))
                .ToListAsync();

            foreach (var perm in permissions)
            {
                _context.RolePermissions.Add(new RolePermission
                {
                    RoleId = role.Id,
                    PermissionId = perm.Id
                });
            }
        }

        role.UpdatedAt = DateTime.UtcNow;
        await _roleManager.UpdateAsync(role);

        await contextSaveAndAuditAsync(currentUserId, "RolePermissionsUpdated", "AspNetRoles", role.Id, $"Updated permissions for role '{role.Name}' ({request.PermissionCodes?.Count ?? 0} assigned).");

        return await GetRolePermissionsAsync(role.Id);
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = await _userManager.Users
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Designation)
            .ToListAsync();

        var userDtos = new List<UserDto>();

        foreach (var user in users)
        {
            var roles = (await _userManager.GetRolesAsync(user)).ToList();

            var lastSession = await _context.EmployeeSessions
                .Where(s => s.EmployeeId == (user.EmployeeId ?? 0))
                .OrderByDescending(s => s.LoginTime)
                .FirstOrDefaultAsync();

            userDtos.Add(new UserDto
            {
                Id = user.Id,
                Username = user.UserName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                EmployeeId = user.EmployeeId,
                EmployeeCode = user.Employee?.EmployeeCode,
                EmployeeName = user.Employee?.Name,
                DepartmentName = user.Employee?.Department?.Name,
                DesignationName = user.Employee?.Designation?.Name,
                Roles = roles,
                IsActive = user.IsActive,
                MustChangePassword = user.MustChangePassword,
                LastLoginTime = lastSession?.LoginTime,
                CreatedAt = user.Employee?.CreatedAt ?? DateTime.UtcNow
            });
        }

        return userDtos.OrderByDescending(u => u.IsActive).ThenBy(u => u.EmployeeName ?? u.Username).ToList();
    }

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        var user = await _userManager.Users
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Department)
            .Include(u => u.Employee)
                .ThenInclude(e => e!.Designation)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        var roles = (await _userManager.GetRolesAsync(user)).ToList();

        var lastSession = await _context.EmployeeSessions
            .Where(s => s.EmployeeId == (user.EmployeeId ?? 0))
            .OrderByDescending(s => s.LoginTime)
            .FirstOrDefaultAsync();

        return new UserDto
        {
            Id = user.Id,
            Username = user.UserName ?? string.Empty,
            Email = user.Email ?? string.Empty,
            EmployeeId = user.EmployeeId,
            EmployeeCode = user.Employee?.EmployeeCode,
            EmployeeName = user.Employee?.Name,
            DepartmentName = user.Employee?.Department?.Name,
            DesignationName = user.Employee?.Designation?.Name,
            Roles = roles,
            IsActive = user.IsActive,
            MustChangePassword = user.MustChangePassword,
            LastLoginTime = lastSession?.LoginTime,
            CreatedAt = user.Employee?.CreatedAt ?? DateTime.UtcNow
        };
    }

    public async Task<UserDto> CreateAdminUserAsync(CreateUserRequest request, int currentUserId, bool isCurrentSuperAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.");

        var existingUser = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (existingUser != null)
            throw new InvalidOperationException($"User with email '{request.Email}' already exists.");

        if (request.Roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) && !isCurrentSuperAdmin)
        {
            throw new UnauthorizedAccessException("Only Super Admin can assign the Super Admin role.");
        }

        if (request.EmployeeId.HasValue && request.EmployeeId.Value > 0)
        {
            var emp = await _context.Employees.FindAsync(request.EmployeeId.Value);
            if (emp == null || !emp.IsActive)
                throw new InvalidOperationException("Selected employee does not exist or is inactive.");

            var existingLinkedUser = await _userManager.Users.FirstOrDefaultAsync(u => u.EmployeeId == request.EmployeeId.Value);
            if (existingLinkedUser != null)
                throw new InvalidOperationException($"Employee #{emp.EmployeeCode} is already linked to user '{existingLinkedUser.UserName}'.");
        }

        var username = string.IsNullOrWhiteSpace(request.Username) ? request.Email.Trim() : request.Username.Trim();

        var newUser = new ApplicationUser
        {
            UserName = username,
            Email = request.Email.Trim(),
            EmployeeId = request.EmployeeId,
            MustChangePassword = request.MustChangePassword,
            IsActive = request.IsActive
        };

        var createResult = await _userManager.CreateAsync(newUser, request.Password);
        if (!createResult.Succeeded)
            throw new InvalidOperationException(string.Join("; ", createResult.Errors.Select(e => e.Description)));

        if (request.Roles != null && request.Roles.Any())
        {
            foreach (var roleName in request.Roles.Distinct())
            {
                if (await _roleManager.RoleExistsAsync(roleName))
                {
                    await _userManager.AddToRoleAsync(newUser, roleName);
                }
            }
        }
        else
        {
            await _userManager.AddToRoleAsync(newUser, "Employee");
        }

        await contextSaveAndAuditAsync(currentUserId, "UserCreated", "ApplicationUser", newUser.Id, $"Created administrator user '{newUser.UserName}' with roles: {string.Join(", ", request.Roles ?? new List<string>())}.");

        return (await GetUserByIdAsync(newUser.Id))!;
    }

    public async Task<UserDto> UpdateAdminUserAsync(int userId, UpdateUserRequest request, int currentUserId, bool isCurrentSuperAdmin)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            throw new KeyNotFoundException($"User with ID {userId} not found.");

        var currentRoles = (await _userManager.GetRolesAsync(user)).ToList();

        // Privilege escalation check
        if (request.Roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) &&
            !currentRoles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) &&
            !isCurrentSuperAdmin)
        {
            throw new UnauthorizedAccessException("Only Super Admin can assign the Super Admin role.");
        }

        if (currentRoles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) &&
            !request.Roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) &&
            !isCurrentSuperAdmin)
        {
            throw new UnauthorizedAccessException("Only Super Admin can remove the Super Admin role.");
        }

        // Protect last active Super Admin
        if (currentRoles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) &&
            (!request.Roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) || request.IsActive == false))
        {
            var superAdmins = await _userManager.GetUsersInRoleAsync("Super Admin");
            var activeSuperAdmins = superAdmins.Where(u => u.IsActive && u.Id != userId).ToList();
            if (!activeSuperAdmins.Any())
            {
                throw new InvalidOperationException("Cannot remove Super Admin privileges or deactivate the last active Super Admin.");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Email) && !string.Equals(user.Email, request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var emailOwner = await _userManager.FindByEmailAsync(request.Email.Trim());
            if (emailOwner != null && emailOwner.Id != user.Id)
                throw new InvalidOperationException($"Email '{request.Email}' is already used by another user.");
            user.Email = request.Email.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Username))
        {
            user.UserName = request.Username.Trim();
        }

        if (IsOriginalSystemAdmin(user) && request.IsActive == false)
        {
            throw new InvalidOperationException($"The original System Administrator account ({user.Email}) is permanently protected and cannot be deactivated.");
        }

        if (request.EmployeeId.HasValue)
        {
            user.EmployeeId = request.EmployeeId;
        }

        if (request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }

        if (request.MustChangePassword.HasValue)
        {
            user.MustChangePassword = request.MustChangePassword.Value;
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new InvalidOperationException(string.Join("; ", updateResult.Errors.Select(e => e.Description)));

        // Update Roles
        if (request.Roles != null)
        {
            var rolesToAdd = request.Roles.Except(currentRoles).ToList();
            var rolesToRemove = currentRoles.Except(request.Roles).ToList();

            if (rolesToAdd.Any())
                await _userManager.AddToRolesAsync(user, rolesToAdd);

            if (rolesToRemove.Any())
                await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
        }

        await contextSaveAndAuditAsync(currentUserId, "UserUpdated", "ApplicationUser", user.Id, $"Updated user '{user.UserName}' roles to: {string.Join(", ", request.Roles ?? currentRoles)}.");

        return (await GetUserByIdAsync(user.Id))!;
    }

    public async Task SetUserActiveStatusAsync(int userId, bool isActive, int currentUserId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            throw new KeyNotFoundException($"User with ID {userId} not found.");

        if (IsOriginalSystemAdmin(user))
        {
            throw new InvalidOperationException($"The original System Administrator account ({user.Email}) is permanently protected and cannot be deactivated or activated.");
        }

        if (!isActive && await _userManager.IsInRoleAsync(user, "Super Admin"))
        {
            var superAdmins = await _userManager.GetUsersInRoleAsync("Super Admin");
            var activeSuperAdmins = superAdmins.Where(u => u.IsActive && u.Id != userId).ToList();
            if (!activeSuperAdmins.Any())
            {
                throw new InvalidOperationException("Cannot deactivate the last active Super Admin.");
            }
        }

        user.IsActive = isActive;
        await _userManager.UpdateAsync(user);

        // If deactivated, terminate active sessions immediately
        if (!isActive && user.EmployeeId.HasValue)
        {
            var sessions = await _context.EmployeeSessions
                .Where(s => s.EmployeeId == user.EmployeeId.Value && s.IsActive)
                .ToListAsync();

            foreach (var s in sessions)
            {
                s.IsActive = false;
                s.LogoutTime = DateTime.UtcNow;
            }
        }

        await contextSaveAndAuditAsync(currentUserId, isActive ? "UserActivated" : "UserDeactivated", "ApplicationUser", user.Id, $"Set active status for '{user.UserName}' to {isActive}.");
    }

    public async Task AdminResetPasswordAsync(int userId, AdminResetPasswordRequest request, int currentUserId)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            throw new ArgumentException("Password must be at least 6 characters long.");

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            throw new KeyNotFoundException($"User with ID {userId} not found.");

        var removeResult = await _userManager.RemovePasswordAsync(user);
        var addResult = await _userManager.AddPasswordAsync(user, request.NewPassword);

        if (!addResult.Succeeded)
            throw new InvalidOperationException(string.Join("; ", addResult.Errors.Select(e => e.Description)));

        user.MustChangePassword = request.MustChangePassword;
        await _userManager.UpdateAsync(user);

        // Invalidate active sessions
        if (user.EmployeeId.HasValue)
        {
            var sessions = await _context.EmployeeSessions
                .Where(s => s.EmployeeId == user.EmployeeId.Value && s.IsActive)
                .ToListAsync();

            foreach (var s in sessions)
            {
                s.IsActive = false;
                s.LogoutTime = DateTime.UtcNow;
            }
        }

        await contextSaveAndAuditAsync(currentUserId, "AdminPasswordReset", "ApplicationUser", user.Id, $"Reset password for user '{user.UserName}'.");
    }

    private async Task contextSaveAndAuditAsync(int currentUserId, string activityType, string refTable, int refId, string remarks)
    {
        var currentUser = await _userManager.FindByIdAsync(currentUserId.ToString());
        var employeeId = currentUser?.EmployeeId ?? 1;

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = activityType,
            RefTable = refTable,
            RefId = refId,
            StartTime = DateTime.UtcNow,
            Status = "Completed",
            Remarks = remarks
        });

        await _context.SaveChangesAsync();
    }

    private bool IsOriginalSystemAdmin(ApplicationUser user)
    {
        if (string.Equals(user.Email, "hariharanrntgemini@gmail.com", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.Email, "admin@riims.local", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.Email, "harideepa0611@gmail.com", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (user.EmployeeId.HasValue && user.Employee != null && user.Employee.EmployeeCode == "EMP-001")
        {
            return true;
        }

        return false;
    }
}
