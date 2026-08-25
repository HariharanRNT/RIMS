using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/attendance-calendar")]
[Authorize]
public class AttendanceCalendarController : ControllerBase
{
    private readonly IAttendanceCalendarService _service;
    private readonly ICurrentUserService _currentUser;

    public AttendanceCalendarController(IAttendanceCalendarService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet("{year:int}/{month:int}")]
    public async Task<IActionResult> GetMonthlyCalendar(int year, int month)
    {
        var result = await _service.GetMonthlyCalendarAsync(year, month);
        return Ok(ApiResponse<List<AttendanceCalendarDto>>.SuccessResponse(result));
    }

    [HttpGet("{year:int}/{month:int}/status")]
    public async Task<IActionResult> GetCalendarStatus(int year, int month)
    {
        var result = await _service.GetCalendarStatusAsync(year, month);
        return Ok(ApiResponse<MonthCalendarStatusDto>.SuccessResponse(result));
    }

    [HttpPost("generate")]
    [RequirePermission("AttendanceCalendar.Manage")]
    public async Task<IActionResult> GenerateCalendar([FromBody] GenerateCalendarRequestDto dto)
    {
        var result = await _service.GenerateMonthlyCalendarAsync(dto.Year, dto.Month);
        return Ok(ApiResponse<List<AttendanceCalendarDto>>.SuccessResponse(result, "Monthly calendar generated successfully."));
    }

    [HttpPut("{id:int}")]
    [RequirePermission("AttendanceCalendar.Manage")]
    public async Task<IActionResult> UpdateCalendarDay(int id, [FromBody] UpdateCalendarDayRequestDto dto)
    {
        var userId = _currentUser.EmployeeId ?? _currentUser.UserId ?? 0;
        dto.Id = id;
        var result = await _service.UpdateCalendarDayAsync(id, dto, userId);
        return Ok(ApiResponse<AttendanceCalendarDto>.SuccessResponse(result, "Calendar day updated successfully."));
    }

    [HttpPost("{id:int}/change")]
    [RequirePermission("AttendanceCalendar.Manage")]
    public async Task<IActionResult> ChangePublishedCalendarDay(int id, [FromBody] UpdateCalendarDayRequestDto dto)
    {
        var userId = _currentUser.EmployeeId ?? _currentUser.UserId ?? 0;
        dto.Id = id;
        var result = await _service.UpdateCalendarDayAsync(id, dto, userId);
        return Ok(ApiResponse<AttendanceCalendarDto>.SuccessResponse(result, "Calendar day updated with audit record."));
    }

    [HttpPost("{year:int}/{month:int}/publish")]
    [RequirePermission("AttendanceCalendar.Publish", "AttendanceCalendar.Manage")]
    public async Task<IActionResult> PublishCalendar(int year, int month)
    {
        var userId = _currentUser.EmployeeId ?? _currentUser.UserId ?? 0;
        var result = await _service.PublishMonthlyCalendarAsync(year, month, userId);
        return Ok(ApiResponse<MonthCalendarStatusDto>.SuccessResponse(result, "Monthly calendar published successfully."));
    }

    [HttpGet("{id:int}/audits")]
    [RequirePermission("AttendanceCalendar.Manage", "AttendanceCalendar.View")]
    public async Task<IActionResult> GetAuditLogs(int id)
    {
        var result = await _service.GetCalendarAuditLogsAsync(id);
        return Ok(ApiResponse<List<AttendanceCalendarAuditDto>>.SuccessResponse(result));
    }

    [HttpGet("employee/{year:int}/{month:int}")]
    public async Task<IActionResult> GetEmployeeMonthlyAttendance(int year, int month, [FromQuery] int? employeeId)
    {
        var targetEmployeeId = employeeId ?? _currentUser.EmployeeId ?? _currentUser.UserId;
        if (!targetEmployeeId.HasValue || targetEmployeeId.Value <= 0)
        {
            return BadRequest(ApiResponse.FailResponse("Employee ID is required to fetch monthly attendance."));
        }

        if (_currentUser.EmployeeId != targetEmployeeId.Value && !await _currentUser.HasPermissionAsync("Attendance.View"))
        {
            return Forbid();
        }

        var result = await _service.GetEmployeeMonthlyAttendanceAsync(targetEmployeeId.Value, year, month);
        return Ok(ApiResponse<List<EmployeeDailyAttendanceSummaryDto>>.SuccessResponse(result));
    }

    [HttpGet("employee/{year:int}/{month:int}/report")]
    public async Task<IActionResult> GetEmployeeMonthlyAttendanceReport(int year, int month, [FromQuery] int? employeeId)
    {
        var targetEmployeeId = employeeId ?? _currentUser.EmployeeId ?? _currentUser.UserId;
        if (!targetEmployeeId.HasValue || targetEmployeeId.Value <= 0)
        {
            return BadRequest(ApiResponse.FailResponse("Employee ID is required to fetch monthly attendance report."));
        }

        if (_currentUser.EmployeeId != targetEmployeeId.Value && !await _currentUser.HasPermissionAsync("Attendance.View"))
        {
            return Forbid();
        }

        var result = await _service.GetEmployeeMonthlyAttendanceReportAsync(targetEmployeeId.Value, year, month);
        return Ok(ApiResponse<EmployeeMonthlyAttendanceReportDto>.SuccessResponse(result));
    }
}
