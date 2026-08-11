using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Attendance;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly IAttendanceService _service;
    private readonly ICurrentUserService _currentUser;

    public AttendanceController(IAttendanceService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login()
    {
        var employeeId = _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID not found in token.");
        var result = await _service.LoginAsync(employeeId);
        return Ok(ApiResponse<AttendanceDto>.SuccessResponse(result));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var employeeId = _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID not found in token.");
        await _service.LogoutAsync(employeeId);
        return Ok(ApiResponse.SuccessResponse("Logged out successfully."));
    }

    [HttpGet("{employeeId}")]
    public async Task<IActionResult> GetByDate(int employeeId, [FromQuery] DateTime? date)
    {
        var targetDate = date ?? DateTime.UtcNow.Date;
        var result = await _service.GetByDateAsync(employeeId, targetDate);
        if (result == null) return NotFound(ApiResponse.FailResponse("No attendance record found."));
        return Ok(ApiResponse<AttendanceDto>.SuccessResponse(result));
    }

    [HttpPost("{id}/mark-permission")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> MarkPermission(int id)
    {
        var result = await _service.MarkPermissionAsync(id);
        return Ok(ApiResponse<AttendanceDto>.SuccessResponse(result, "Attendance marked as Permission successfully."));
    }

    [HttpGet("permission-summary/{employeeId}")]
    public async Task<IActionResult> GetPermissionSummary(int employeeId, [FromQuery] int? month, [FromQuery] int? year)
    {
        var now = DateTime.UtcNow;
        var targetMonth = month ?? now.Month;
        var targetYear = year ?? now.Year;
        var result = await _service.GetPermissionSummaryAsync(employeeId, targetYear, targetMonth);
        return Ok(ApiResponse<PermissionSummaryDto>.SuccessResponse(result));
    }
}
