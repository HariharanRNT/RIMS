using RIIMS.Application.DTOs.Auth;

namespace RIIMS.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, string? ipAddress);
    Task<bool> ValidateResetTokenAsync(string token);
    Task ResetPasswordWithTokenAsync(ResetPasswordWithTokenRequest request, string? ipAddress);
    Task<CurrentUserProfileDto> GetCurrentUserProfileAsync(int userId);
}
