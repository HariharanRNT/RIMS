using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PayrollController : ControllerBase
{
    private readonly IPayrollService _service;
    private readonly ICurrentUserService _currentUser;

    public PayrollController(IPayrollService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("process")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Process([FromBody] ProcessPayrollRequest request)
    {
        var result = await _service.ProcessMonthlyPayrollAsync(request.Month, request.Year);
        return Ok(ApiResponse<PayrollSummaryDto>.SuccessResponse(result));
    }

    [HttpGet("summary")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetSummary([FromQuery] int month, [FromQuery] int year)
    {
        var result = await _service.GetMonthlyPayrollSummaryAsync(month, year);
        return Ok(ApiResponse<PayrollSummaryDto>.SuccessResponse(result));
    }

    [HttpGet("payslip/{employeeId}")]
    public async Task<IActionResult> GetPayslip(int employeeId, [FromQuery] int month, [FromQuery] int year)
    {
        // Security Rule #10: Employees must not be able to access another employee's payslip
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        var result = await _service.GetEmployeePayslipAsync(employeeId, month, year);
        if (result == null) return NotFound(ApiResponse.FailResponse("Payslip not found for specified month/year."));
        return Ok(ApiResponse<PayslipDto>.SuccessResponse(result));
    }

    [HttpGet("my-payslips/{employeeId}")]
    public async Task<IActionResult> GetMyPayslips(int employeeId)
    {
        // Security Rule #10: Employees must not be able to access another employee's payslip
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        var result = await _service.GetEmployeePayslipHistoryAsync(employeeId);
        return Ok(ApiResponse<List<PayslipDto>>.SuccessResponse(result));
    }
}
