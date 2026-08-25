using System.Security.Claims;
using RIIMS.Application.Common;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IServiceProvider _serviceProvider;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor, IServiceProvider serviceProvider)
    {
        _httpContextAccessor = httpContextAccessor;
        _serviceProvider = serviceProvider;
    }

    public int? UserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return sub != null && int.TryParse(sub, out var id) ? id : null;
        }
    }

    public int? EmployeeId
    {
        get
        {
            var empId = _httpContextAccessor.HttpContext?.User?.FindFirstValue("employeeId");
            return empId != null && int.TryParse(empId, out var id) && id > 0 ? id : null;
        }
    }

    public string? Role => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);

    public IReadOnlyList<string> Roles
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;
            if (user == null) return Array.Empty<string>();

            return user.FindAll(ClaimTypes.Role).Select(c => c.Value).Distinct().ToList();
        }
    }

    public bool IsSuperAdmin => Roles.Contains("Super Admin", StringComparer.OrdinalIgnoreCase) || Roles.Contains("Admin", StringComparer.OrdinalIgnoreCase);

    public bool IsAdmin => IsSuperAdmin || Roles.Any(r => r.EndsWith("Admin", StringComparison.OrdinalIgnoreCase) || r.Equals("Admin", StringComparison.OrdinalIgnoreCase));

    public bool HasRole(string role)
    {
        return Roles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<bool> HasPermissionAsync(string permission)
    {
        if (IsSuperAdmin) return true;
        if (!UserId.HasValue) return false;

        using var scope = _serviceProvider.CreateScope();
        var permService = scope.ServiceProvider.GetRequiredService<IPermissionManagementService>();
        return await permService.HasPermissionAsync(UserId.Value, permission);
    }
}
