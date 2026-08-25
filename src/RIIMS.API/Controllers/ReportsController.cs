using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Report;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    private readonly ICurrentUserService _currentUser;

    public ReportsController(IReportService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet("admin-dashboard")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminDashboard()
    {
        var result = await _service.GetAdminDashboardMetricsAsync();
        return Ok(ApiResponse<AdminDashboardMetricsDto>.SuccessResponse(result));
    }

    [HttpGet("employee-dashboard/{employeeId}")]
    public async Task<IActionResult> GetEmployeeDashboard(int employeeId)
    {
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        var result = await _service.GetEmployeeDashboardMetricsAsync(employeeId);
        return Ok(ApiResponse<EmployeeDashboardMetricsDto>.SuccessResponse(result));
    }

    [HttpGet("monthly-production")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetMonthlyProduction([FromQuery] int month, [FromQuery] int year, [FromQuery] int? employeeId, [FromQuery] int? departmentId)
    {
        var result = await _service.GetMonthlyProductionReportAsync(month, year, employeeId, departmentId);
        return Ok(ApiResponse<List<MonthlyProductionItemDto>>.SuccessResponse(result));
    }

    [HttpGet("daily-production")]
    [Authorize]
    public async Task<IActionResult> GetDailyProduction(
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? employeeId,
        [FromQuery] int? departmentId)
    {
        if (!_currentUser.IsAdmin)
        {
            employeeId = _currentUser.EmployeeId;
        }

        var start = startDate ?? date ?? DateTime.UtcNow.Date;
        var end = endDate ?? date ?? DateTime.UtcNow.Date;
        var result = await _service.GetDailyProductionReportAsync(start, end, employeeId, departmentId);
        return Ok(ApiResponse<List<DailyProductionItemDto>>.SuccessResponse(result));
    }

    [HttpGet("export-daily-production")]
    [Authorize]
    public async Task<IActionResult> ExportDailyProduction(
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? employeeId,
        [FromQuery] int? departmentId)
    {
        if (!_currentUser.IsAdmin)
        {
            employeeId = _currentUser.EmployeeId;
        }

        var start = startDate ?? date ?? DateTime.UtcNow.Date;
        var end = endDate ?? date ?? DateTime.UtcNow.Date;

        var fileBytes = await _service.ExportDailyProductionExcelAsync(start, end, employeeId, departmentId);

        string fileName = start.Date == end.Date
            ? $"Performance_Report_{start:yyyy-MM-dd}.xlsx"
            : $"Performance_Report_{start:yyyy-MM-dd}_to_{end:yyyy-MM-dd}.xlsx";

        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("attendance-permissions")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAttendancePermissions(
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? employeeId,
        [FromQuery] int? departmentId)
    {
        var start = startDate ?? date ?? DateTime.UtcNow.Date;
        var end = endDate ?? date ?? DateTime.UtcNow.Date;
        var result = await _service.GetDailyProductionReportAsync(start, end, employeeId, departmentId);
        return Ok(ApiResponse<List<DailyProductionItemDto>>.SuccessResponse(result));
    }

    [HttpGet("daily-detail/{employeeId}")]
    [Authorize]
    public async Task<IActionResult> GetDailyDetail(
        int employeeId,
        [FromQuery] DateTime? date,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        var start = startDate ?? date ?? DateTime.UtcNow.Date;
        var end = endDate ?? date ?? DateTime.UtcNow.Date;
        var result = await _service.GetEmployeeDailyDetailAsync(employeeId, start, end);
        return Ok(ApiResponse<EmployeeDailyDetailDto>.SuccessResponse(result));
    }



    [HttpGet("work-distribution")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetWorkDistribution([FromQuery] int month, [FromQuery] int year)
    {
        var result = await _service.GetWorkDistributionReportAsync(month, year);
        return Ok(ApiResponse<WorkDistributionReportDto>.SuccessResponse(result));
    }

    [HttpGet("admin-notifications")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminNotifications()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var result = await _service.GetAdminNotificationsAsync(userId);
        return Ok(ApiResponse<AdminNotificationSummaryDto>.SuccessResponse(result));
    }

    public class MarkReadRequest
    {
        public string Key { get; set; } = string.Empty;
    }

    [HttpPost("admin-notifications/read")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> MarkNotificationRead([FromBody] MarkReadRequest request)
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        await _service.MarkNotificationReadAsync(userId, request.Key);
        return Ok(ApiResponse.SuccessResponse("Notification marked as read."));
    }

    [HttpPost("admin-notifications/read-all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> MarkAllNotificationsRead()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        await _service.MarkAllNotificationsReadAsync(userId);
        return Ok(ApiResponse.SuccessResponse("All notifications marked as read."));
    }
}

