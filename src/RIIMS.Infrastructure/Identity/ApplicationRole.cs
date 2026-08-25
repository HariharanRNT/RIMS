using Microsoft.AspNetCore.Identity;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Identity;

public class ApplicationRole : IdentityRole<int>
{
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public bool IsProtected { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
