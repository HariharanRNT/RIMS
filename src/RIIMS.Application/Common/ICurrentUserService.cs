namespace RIIMS.Application.Common;

public interface ICurrentUserService
{
    int? UserId { get; }
    int? EmployeeId { get; }
    string? Role { get; }
    bool IsAdmin { get; }
}
