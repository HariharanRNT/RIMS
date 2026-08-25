using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Employee;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _service;
    private readonly ICurrentUserService _currentUser;

    public EmployeesController(IEmployeeService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission("Employee.View")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? departmentId = null,
        [FromQuery] string? search = null)
    {
        var result = await _service.GetAllAsync(page, pageSize, departmentId, search);
        return Ok(ApiResponse<PagedResult<EmployeeListDto>>.SuccessResponse(result));
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetMyProfile()
    {
        var empId = _currentUser.EmployeeId ?? 0;
        var userId = _currentUser.UserId;

        var result = await _service.GetMyProfileAsync(empId, userId);
        if (result == null) return NotFound(ApiResponse.FailResponse("Employee profile not found."));
        return Ok(ApiResponse<EmployeeDto>.SuccessResponse(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (_currentUser.EmployeeId != id && !await _currentUser.HasPermissionAsync("Employee.View"))
        {
            return Forbid();
        }

        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound(ApiResponse.FailResponse("Employee not found."));
        return Ok(ApiResponse<EmployeeDto>.SuccessResponse(result));
    }

    [HttpPost]
    [RequirePermission("Employee.Create")]
    public async Task<IActionResult> Create(
        [FromBody] CreateEmployeeRequest request,
        [FromServices] FluentValidation.IValidator<CreateEmployeeRequest> validator)
    {
        var validationResult = await validator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<EmployeeDto>.FailResponse(errors.FirstOrDefault() ?? "Validation failed.", errors));
        }

        var result = await _service.CreateAsync(request, _currentUser.UserId ?? 0);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<EmployeeDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [RequirePermission("Employee.Edit")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateEmployeeRequest request,
        [FromServices] FluentValidation.IValidator<UpdateEmployeeRequest> validator)
    {
        var validationResult = await validator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage).ToList();
            return BadRequest(ApiResponse<EmployeeDto>.FailResponse(errors.FirstOrDefault() ?? "Validation failed.", errors));
        }

        var result = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<EmployeeDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [RequirePermission("Employee.Delete", "Employee.Deactivate")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Employee deactivated."));
    }

    [HttpGet("{id}/work-details")]
    public async Task<IActionResult> GetWorkDetails(int id)
    {
        if (_currentUser.EmployeeId != id && !await _currentUser.HasPermissionAsync("Employee.View"))
        {
            return Forbid();
        }

        var result = await _service.GetWorkDetailAsync(id);
        if (result == null) return NotFound(ApiResponse.FailResponse("Work details not found."));
        return Ok(ApiResponse<EmployeeWorkDetailDto>.SuccessResponse(result));
    }

    [HttpPut("{id}/work-details")]
    [RequirePermission("Employee.Edit")]
    public async Task<IActionResult> UpdateWorkDetails(int id, [FromBody] UpdateWorkDetailRequest request)
    {
        var result = await _service.UpdateWorkDetailAsync(id, request);
        return Ok(ApiResponse<EmployeeWorkDetailDto>.SuccessResponse(result));
    }
}
