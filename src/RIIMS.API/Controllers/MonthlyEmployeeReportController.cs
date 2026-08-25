using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/payroll/monthly-report")]
[Authorize(Roles = "Admin")]
public class MonthlyEmployeeReportController : ControllerBase
{
    private readonly IMonthlyEmployeeReportService _reportService;

    public MonthlyEmployeeReportController(IMonthlyEmployeeReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMonthlyReport(
        [FromQuery] int year,
        [FromQuery] int month,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null,
        [FromQuery] int? departmentId = null,
        [FromQuery] int? designationId = null,
        [FromQuery] string? lop = null,
        [FromQuery] string? salary = null,
        [FromQuery] int? employeeId = null)
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            return BadRequest(ApiResponse<string>.FailResponse("Invalid year or month specified."));
        }

        var report = await _reportService.GetMonthlyReportAsync(
            year, month, page, pageSize, search, departmentId, designationId, lop, salary, employeeId);
        return Ok(ApiResponse<PagedResult<MonthlyEmployeePayrollReportDto>>.SuccessResponse(report, "Monthly employee payroll report fetched successfully."));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] int year,
        [FromQuery] int month)
    {
        if (year < 2000 || year > 2100 || month < 1 || month > 12)
        {
            return BadRequest("Invalid year or month specified.");
        }

        var excelBytes = await _reportService.GenerateExcelReportAsync(year, month);
        string monthName = new DateTime(year, month, 1).ToString("MMMM");
        string fileName = $"Monthly_Payroll_Report_{monthName}_{year}.xlsx";

        return File(
            excelBytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }
}
