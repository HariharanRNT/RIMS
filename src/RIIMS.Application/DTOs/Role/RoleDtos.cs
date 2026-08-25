namespace RIIMS.Application.DTOs.Role;

public class RoleDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public bool IsProtected { get; set; }
    public bool IsActive { get; set; }
    public int UsersCount { get; set; }
    public int PermissionsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> PermissionCodes { get; set; } = new();
}

public class UpdateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class RolePermissionsDto
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public bool IsProtected { get; set; }
    public List<string> AssignedPermissionCodes { get; set; } = new();
}

public class UpdateRolePermissionsRequest
{
    public List<string> PermissionCodes { get; set; } = new();
}
