using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
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
    [RequirePermission("SalaryStructure.View", "SalaryStructure.Manage", "Payroll.View")]
    public IActionResult PreviewSalaryStructure([FromBody] SalaryPreviewRequestDto request)
    {
        try
        {
            var result = _salaryStructureService.CalculateSalaryPreview(request);
            return Ok(ApiResponse<SalaryPreviewResponseDto>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse.FailResponse(ex.Message));
        }
    }

    [HttpGet("employees/{employeeId}/salary-structure")]
    public async Task<IActionResult> GetActiveSalaryStructure(int employeeId, [FromQuery] DateTime? forDate)
    {
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("SalaryStructure.View"))
        {
            return Forbid();
        }

        try
        {
            var result = await _salaryStructureService.GetActiveSalaryStructureAsync(employeeId, forDate);
            return Ok(ApiResponse<SalaryStructureResponseDto>.SuccessResponse(result!));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse.FailResponse(ex.Message));
        }
    }

    [HttpPost("employees/{employeeId}/salary-structure")]
    [RequirePermission("SalaryStructure.Manage")]
    public async Task<IActionResult> CreateOrUpdateSalaryStructure(int employeeId, [FromBody] CreateSalaryStructureDto dto)
    {
        try
        {
            var result = await _salaryStructureService.CreateOrUpdateSalaryStructureAsync(employeeId, dto);
            return Ok(ApiResponse<SalaryStructureResponseDto>.SuccessResponse(result, "Salary structure saved successfully."));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse.FailResponse(ex.Message));
        }
    }

    [HttpGet("employees/{employeeId}/salary-history")]
    public async Task<IActionResult> GetSalaryHistory(int employeeId)
    {
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("SalaryStructure.View"))
        {
            return Forbid();
        }

        try
        {
            var result = await _salaryStructureService.GetSalaryHistoryAsync(employeeId);
            return Ok(ApiResponse<List<SalaryStructureResponseDto>>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            return BadRequest(ApiResponse.FailResponse(ex.Message));
        }
    }
}
