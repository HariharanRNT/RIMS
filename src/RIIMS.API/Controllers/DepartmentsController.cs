using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Department;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _service;

    public DepartmentsController(IDepartmentService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission("Department.View", "Employee.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<List<DepartmentDto>>.SuccessResponse(result));
    }

    [HttpGet("{id}")]
    [RequirePermission("Department.View", "Employee.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound(ApiResponse.FailResponse("Department not found."));
        return Ok(ApiResponse<DepartmentDto>.SuccessResponse(result));
    }

    [HttpPost]
    [RequirePermission("Department.Manage")]
    public async Task<IActionResult> Create([FromBody] CreateDepartmentRequest request)
    {
        var result = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<DepartmentDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [RequirePermission("Department.Manage")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDepartmentRequest request)
    {
        var result = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<DepartmentDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [RequirePermission("Department.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Department deleted."));
    }
}
