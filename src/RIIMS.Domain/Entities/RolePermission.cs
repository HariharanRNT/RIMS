namespace RIIMS.Domain.Entities;

public class RolePermission
{
    public int RoleId { get; set; }
    public int PermissionId { get; set; }

    // Navigation
    public virtual Permission Permission { get; set; } = null!;
}
