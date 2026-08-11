using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Auth;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAttendanceService _attendanceService;

    public AuthController(IAuthService authService, IAttendanceService attendanceService)
    {
        _authService = authService;
        _attendanceService = attendanceService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);

        // Auto-trigger attendance login for Employee role
        if (result.Role == "Employee" && result.EmployeeId > 0)
        {
            await _attendanceService.LoginAsync(result.EmployeeId);
        }

        return Ok(ApiResponse<LoginResponse>.SuccessResponse(result));
    }

    [HttpPost("change-password")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        await _authService.ChangePasswordAsync(userId, request);
        return Ok(ApiResponse.SuccessResponse("Password changed successfully."));
    }
}
