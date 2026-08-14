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
    private readonly IPasswordHasher<ApplicationUser> _passwordHasher;
    private readonly ISessionService _sessionService;
    private readonly IConfiguration _configuration;
    private readonly RiimsDbContext _context;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IPasswordHasher<ApplicationUser> passwordHasher,
        ISessionService sessionService,
        IConfiguration configuration,
        RiimsDbContext context)
    {
        _userManager = userManager;
        _passwordHasher = passwordHasher;
        _sessionService = sessionService;
        _configuration = configuration;
        _context = context;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid email or password.");

        // 1. Password Verification & Legacy Plaintext Migration Strategy
        bool isPasswordValid = false;

        if (!string.IsNullOrEmpty(user.PasswordHash))
        {
            try
            {
                var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
                if (verificationResult == PasswordVerificationResult.Success)
                {
                    isPasswordValid = true;
                }
                else if (verificationResult == PasswordVerificationResult.SuccessRehashNeeded)
                {
                    isPasswordValid = true;
                    user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
                    await _userManager.UpdateAsync(user);
                }
            }
            catch (FormatException)
            {
                // Legacy plaintext password is not a valid Base64 string for standard Identity hasher
            }
        }

        // Fallback for legacy unhashed plaintext stored passwords (migrates on first successful login)
        if (!isPasswordValid && user.PasswordHash == request.Password)
        {
            isPasswordValid = true;
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
            await _userManager.UpdateAsync(user);
        }

        if (!isPasswordValid)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Employee";

        int employeeId = user.EmployeeId ?? 0;

        // 2. Create EmployeeSession (Enforces Single Active Session Policy)
        var (sessionId, tokenJti) = await _sessionService.CreateSessionAsync(employeeId);

        // 3. Generate JWT Token containing SessionId & TokenJti claims
        var token = GenerateJwtToken(user, role, sessionId, tokenJti);

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
            EmployeeId = employeeId,
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

    private string GenerateJwtToken(ApplicationUser user, string role, Guid sessionId, string tokenJti)
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
            new Claim("sessionId", sessionId.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, tokenJti)
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
