using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using RIIMS.Application.DTOs.Auth;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IPasswordHasher<ApplicationUser> _passwordHasher;
    private readonly ISessionService _sessionService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly RiimsDbContext _context;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        IPasswordHasher<ApplicationUser> passwordHasher,
        ISessionService sessionService,
        IEmailService emailService,
        IConfiguration configuration,
        RiimsDbContext context)
    {
        _userManager = userManager;
        _passwordHasher = passwordHasher;
        _sessionService = sessionService;
        _emailService = emailService;
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

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request, string? ipAddress)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user == null)
        {
            // Security best practice: return silently to prevent account enumeration
            return;
        }

        // Rate limiting check: max 3 requests per email per 15 minutes
        var recentRequestsCount = await _context.PasswordResetTokens
            .CountAsync(t => t.UserId == user.Id && t.CreatedAt >= DateTime.UtcNow.AddMinutes(-15));

        if (recentRequestsCount >= 3)
        {
            throw new InvalidOperationException("Too many reset requests. Please try again in 15 minutes.");
        }

        // Invalidate previous unused reset tokens for this user
        var activeTokens = await _context.PasswordResetTokens
            .Where(t => t.UserId == user.Id && !t.IsUsed)
            .ToListAsync();

        foreach (var activeToken in activeTokens)
        {
            activeToken.IsUsed = true;
        }

        // Generate cryptographically secure random token (32 bytes)
        var rawTokenBytes = RandomNumberGenerator.GetBytes(32);
        string rawToken = Convert.ToHexString(rawTokenBytes).ToLowerInvariant();

        // Hash token with SHA-256 before saving to DB
        string tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();

        var resetTokenEntity = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            IsUsed = false,
            CreatedByIp = ipAddress
        };

        _context.PasswordResetTokens.Add(resetTokenEntity);
        await _context.SaveChangesAsync();

        // Send Outlook-compatible table-based HTML email with VML button fallback
        string baseUrl = _configuration["AppUrl"] ?? "http://localhost:3000";
        string resetUrl = $"{baseUrl}/reset-password?token={rawToken}";

        string htmlBody = $$"""
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password - RIIMS V2</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a, h1, h2, h3, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0A0F0E; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#0A0F0E" style="background-color: #0A0F0E; width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <!-- 600px Centered Main Container Table -->
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#12201E" style="width: 600px; max-width: 600px; background-color: #12201E; border: 1px solid #1B2E2B; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
          
          <!-- 1. Header Row -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px 32px; background-color: #0A0F0E; border-bottom: 1px solid #1B2E2B;">
              <h2 style="margin: 0; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">
                RIIMS <span style="color: #E8873C;">V2</span>
              </h2>
              <div style="margin-top: 4px; color: #E8873C; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
                INTEGRATED INFORMATION MANAGEMENT SYSTEM
              </div>
            </td>
          </tr>

          <!-- 2. Body Content Row -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background-color: #12201E;">
              <h3 style="margin: 0 0 16px 0; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 700; line-height: 1.3;">
                Reset Your Password
              </h3>
              <p style="margin: 0 0 16px 0; color: #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6;">
                Hello,
              </p>
              <p style="margin: 0 0 28px 0; color: #E2E8F0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6;">
                We received a request to reset the password for your RIIMS V2 portal account. Click the button below to choose a new password:
              </p>

              <!-- 3. Bulletproof VML + HTML Button Row -->
              <div align="center" style="margin: 28px 0; text-align: center;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{resetUrl}}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="16%" stroke="f" fillcolor="#E8873C">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">Reset Password</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="{{resetUrl}}" target="_blank" style="background-color: #E8873C; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; display: inline-block; -webkit-text-size-adjust: none;">Reset Password</a>
                <!--<![endif]-->
              </div>

              <!-- Fallback Direct Link -->
              <p style="margin: 24px 0 0 0; color: #A0AEC0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; word-break: break-all;">
                If the button above does not work, copy and paste this link into your web browser:<br/>
                <a href="{{resetUrl}}" style="color: #E8873C; text-decoration: underline;">{{resetUrl}}</a>
              </p>
            </td>
          </tr>

          <!-- 4. Notice Box Row -->
          <tr>
            <td style="padding: 0 32px 28px 32px; background-color: #12201E;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#1B2E2B" style="background-color: #1B2E2B; border: 1px solid #2D4A45; border-radius: 8px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 6px 0; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.5;">
                      <strong>⚠️ Expiry Notice:</strong> This link expires in <strong>30 minutes</strong>.
                    </p>
                    <p style="margin: 0; color: #A0AEC0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5;">
                      If you did not request a password reset, you can safely ignore this email — your account remains secure.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 5. Footer Row -->
          <tr>
            <td align="center" style="padding: 20px 32px; background-color: #0A0F0E; border-top: 1px solid #1B2E2B;">
              <p style="margin: 0; color: #718096; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.5; text-align: center;">
                © 2026 Reshand & Thosh Technologies Pvt Ltd. All rights reserved.<br/>
                🔒 Automated Security System • Do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
""";

        await _emailService.SendEmailAsync(user.Email!, "Reset Your Password - RIIMS V2", htmlBody);
    }

    public async Task<bool> ValidateResetTokenAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        string tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()))).ToLowerInvariant();

        var resetToken = await _context.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

        return resetToken != null;
    }

    public async Task ResetPasswordWithTokenAsync(ResetPasswordWithTokenRequest request, string? ipAddress)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
            throw new InvalidOperationException("Invalid reset token.");

        string tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Token.Trim()))).ToLowerInvariant();

        var resetToken = await _context.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow);

        if (resetToken == null)
        {
            throw new InvalidOperationException("This reset link has expired or is invalid. Please request a new one.");
        }

        var user = await _userManager.FindByIdAsync(resetToken.UserId.ToString());
        if (user == null)
        {
            throw new KeyNotFoundException("Associated user account not found.");
        }

        // Validate Password Strength Rules (min 8 chars, 1 uppercase, 1 number, 1 symbol)
        if (request.NewPassword.Length < 8 ||
            !request.NewPassword.Any(char.IsUpper) ||
            !request.NewPassword.Any(char.IsDigit) ||
            !request.NewPassword.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            throw new InvalidOperationException("Password must be at least 8 characters long and contain an uppercase letter, a number, and a special character.");
        }

        // Reset password via Identity
        var removePassResult = await _userManager.RemovePasswordAsync(user);
        var addPassResult = await _userManager.AddPasswordAsync(user, request.NewPassword);

        if (!addPassResult.Succeeded)
        {
            var errors = addPassResult.Errors.Select(e => e.Description).ToList();
            throw new InvalidOperationException(string.Join("; ", errors));
        }

        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);

        // Mark token as used
        resetToken.IsUsed = true;
        resetToken.UsedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Invalidate existing active sessions for security
        if (user.EmployeeId.HasValue && user.EmployeeId.Value > 0)
        {
            var activeSessions = await _context.EmployeeSessions
                .Where(s => s.EmployeeId == user.EmployeeId.Value && s.IsActive)
                .ToListAsync();

            foreach (var session in activeSessions)
            {
                session.IsActive = false;
            }

            // Log password reset to ActivityTimeline audit log
            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = user.EmployeeId.Value,
                ActivityType = "PasswordReset",
                RefTable = "ApplicationUser",
                RefId = user.Id,
                StartTime = DateTime.UtcNow,
                Status = "Completed",
                Remarks = $"Password reset via email link from IP: {ipAddress ?? "Unknown"}"
            });

            await _context.SaveChangesAsync();
        }
    }
}
