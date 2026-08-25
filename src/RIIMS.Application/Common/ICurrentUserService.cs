namespace RIIMS.Application.Common;

public interface ICurrentUserService
{
    int? UserId { get; }
    int? EmployeeId { get; }
    string? Role { get; }
    IReadOnlyList<string> Roles { get; }
    bool IsAdmin { get; }
    bool IsSuperAdmin { get; }
    bool HasRole(string role);
    Task<bool> HasPermissionAsync(string permission);
}
