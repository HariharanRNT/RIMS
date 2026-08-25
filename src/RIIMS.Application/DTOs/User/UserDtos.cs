namespace RIIMS.Application.DTOs.User;

public class UserDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int? EmployeeId { get; set; }
    public string? EmployeeCode { get; set; }
    public string? EmployeeName { get; set; }
    public string? DepartmentName { get; set; }
    public string? DesignationName { get; set; }
    public List<string> Roles { get; set; } = new();
    public bool IsActive { get; set; }
    public bool MustChangePassword { get; set; }
    public DateTime? LastLoginTime { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int? EmployeeId { get; set; }
    public List<string> Roles { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = true;
}

public class UpdateUserRequest
{
    public string? Email { get; set; }
    public string? Username { get; set; }
    public int? EmployeeId { get; set; }
    public List<string> Roles { get; set; } = new();
    public bool? IsActive { get; set; }
    public bool? MustChangePassword { get; set; }
}

public class AssignRolesRequest
{
    public List<string> Roles { get; set; } = new();
}

public class AdminResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; } = true;
}
