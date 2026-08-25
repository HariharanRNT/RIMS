namespace RIIMS.Application.DTOs.Permission;

public class AppPermissionDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class ModulePermissionsDto
{
    public string Module { get; set; } = string.Empty;
    public List<AppPermissionDto> Permissions { get; set; } = new();
}
