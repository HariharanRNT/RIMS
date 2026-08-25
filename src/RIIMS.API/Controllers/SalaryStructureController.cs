using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class SalaryStructureController : ControllerBase
{
    private readonly ISalaryStructureService _salaryStructureService;
    private readonly ICurrentUserService _currentUser;

    public SalaryStructureController(ISalaryStructureService salaryStructureService, ICurrentUserService currentUser)
    {
        _salaryStructureService = salaryStructureService;
        _currentUser = currentUser;
    }

    [HttpPost("payroll/preview")]
    [Authorize(Roles = "Admin")]
    public IActionResult PreviewSalaryStructure([FromBody] SalaryPreviewRequestDto request)
    {
        try
        {
            var result = _salaryStructureService.CalculateSalaryPreview(request);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("employees/{employeeId}/salary-structure")]
    [Authorize(Roles = "Admin,Employee")]
    public async Task<IActionResult> GetActiveSalaryStructure(int employeeId, [FromQuery] DateTime? forDate)
    {
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        try
        {
            var result = await _salaryStructureService.GetActiveSalaryStructureAsync(employeeId, forDate);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("employees/{employeeId}/salary-structure")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateOrUpdateSalaryStructure(int employeeId, [FromBody] CreateSalaryStructureDto dto)
    {
        try
        {
            var result = await _salaryStructureService.CreateOrUpdateSalaryStructureAsync(employeeId, dto);
            return Ok(new { success = true, message = "Salary structure saved successfully.", data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("employees/{employeeId}/salary-history")]
    [Authorize(Roles = "Admin,Employee")]
    public async Task<IActionResult> GetSalaryHistory(int employeeId)
    {
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        try
        {
            var result = await _salaryStructureService.GetSalaryHistoryAsync(employeeId);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
