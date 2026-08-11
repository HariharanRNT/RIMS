using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RIIMS.Application.DTOs.Auth;
using RIIMS.Application.Interfaces;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly RiimsDbContext _context;

    public AuthService(UserManager<ApplicationUser> userManager, IConfiguration configuration, RiimsDbContext context)
    {
        _userManager = userManager;
        _configuration = configuration;
        _context = context;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var isValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!isValid)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Employee";

        var token = GenerateJwtToken(user, role);

        string employeeName = role == "Admin" ? "System Administrator" : "Employee";
        if (user.EmployeeId.HasValue && user.EmployeeId.Value > 0)
        {
            var emp = await _context.Employees.FindAsync(user.EmployeeId.Value);
            if (emp != null && !string.IsNullOrWhiteSpace(emp.Name))
            {
                employeeName = emp.Name;
            }
        }
        else if (!string.IsNullOrWhiteSpace(user.UserName) && !user.UserName.Contains("@"))
        {
            employeeName = user.UserName;
        }

        return new LoginResponse
        {
            Token = token,
            Role = role,
            MustChangePassword = user.MustChangePassword,
            EmployeeId = user.EmployeeId ?? 0,
            EmployeeName = employeeName
        };
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            throw new KeyNotFoundException("User not found.");

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            throw new InvalidOperationException(string.Join("; ", errors));
        }

        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);
    }

    private string GenerateJwtToken(ApplicationUser user, string role)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Role, role),
            new Claim("employeeId", user.EmployeeId?.ToString() ?? "0"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(double.Parse(jwtSettings["ExpiryHours"] ?? "8")),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
