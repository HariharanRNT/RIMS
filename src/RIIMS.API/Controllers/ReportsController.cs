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

    public ReportsController(IReportService service)
    {
        _service = service;
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
        var result = await _service.GetEmployeeDashboardMetricsAsync(employeeId);
        return Ok(ApiResponse<EmployeeDashboardMetricsDto>.SuccessResponse(result));
    }

    [HttpGet("monthly-production")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetMonthlyProduction([FromQuery] int month, [FromQuery] int year, [FromQuery] int? departmentId)
    {
        var result = await _service.GetMonthlyProductionReportAsync(month, year, departmentId);
        return Ok(ApiResponse<List<MonthlyProductionItemDto>>.SuccessResponse(result));
    }

    [HttpGet("daily-production")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetDailyProduction([FromQuery] DateTime? date, [FromQuery] int? departmentId)
    {
        var targetDate = date ?? DateTime.UtcNow.Date;
        var result = await _service.GetDailyProductionReportAsync(targetDate, departmentId);
        return Ok(ApiResponse<List<DailyProductionItemDto>>.SuccessResponse(result));
    }

    [HttpGet("daily-detail/{employeeId}")]
    [Authorize]
    public async Task<IActionResult> GetDailyDetail(int employeeId, [FromQuery] DateTime? date)
    {
        var targetDate = date ?? DateTime.UtcNow.Date;
        var result = await _service.GetEmployeeDailyDetailAsync(employeeId, targetDate);
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
        var result = await _service.GetAdminNotificationsAsync();
        return Ok(ApiResponse<AdminNotificationSummaryDto>.SuccessResponse(result));
    }
}

