using Microsoft.AspNetCore.Identity;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<int>
{
    public int? EmployeeId { get; set; }
    public bool MustChangePassword { get; set; } = true;
    public bool IsActive { get; set; } = true;

    // Navigation
    public Employee? Employee { get; set; }
}
