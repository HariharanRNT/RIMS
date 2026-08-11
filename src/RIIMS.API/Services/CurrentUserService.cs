using System.Security.Claims;
using RIIMS.Application.Common;

namespace RIIMS.API.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public int? UserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return sub != null ? int.Parse(sub) : null;
        }
    }

    public int? EmployeeId
    {
        get
        {
            var empId = _httpContextAccessor.HttpContext?.User?.FindFirstValue("employeeId");
            return empId != null && empId != "0" ? int.Parse(empId) : null;
        }
    }

    public string? Role => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Role);

    public bool IsAdmin => Role == "Admin";
}
