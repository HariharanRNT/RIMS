using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.ProductDeployment;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/product-deployment")]
[Authorize]
public class ProductDeploymentController : ControllerBase
{
    private readonly IProductDeploymentService _service;

    public ProductDeploymentController(IProductDeploymentService service)
    {
        _service = service;
    }

    private int CurrentUserId
    {
        get
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetDeployments([FromQuery] ProductDeploymentFilter filter)
    {
        var result = await _service.GetDeploymentsAsync(CurrentUserId, filter);
        return Ok(ApiResponse<PagedResult<ProductDeploymentDto>>.SuccessResponse(result));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetDeploymentById(int id)
    {
        var result = await _service.GetDeploymentByIdAsync(CurrentUserId, id);
        if (result == null)
            return NotFound(ApiResponse.FailResponse("Deployment record not found."));

        return Ok(ApiResponse<ProductDeploymentDto>.SuccessResponse(result));
    }

    [HttpPost]
    public async Task<IActionResult> CreateDeployment([FromBody] CreateProductDeploymentRequest request)
    {
        var result = await _service.CreateDeploymentAsync(CurrentUserId, request);
        return CreatedAtAction(nameof(GetDeploymentById), new { id = result.Id }, ApiResponse<ProductDeploymentDto>.SuccessResponse(result, "Deployment record created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateDeployment(int id, [FromBody] UpdateProductDeploymentRequest request)
    {
        var result = await _service.UpdateDeploymentAsync(CurrentUserId, id, request);
        return Ok(ApiResponse<ProductDeploymentDto>.SuccessResponse(result, "Deployment record updated successfully."));
    }

    [HttpPost("{id:int}/status")]
    public async Task<IActionResult> ChangeStatus(int id, [FromBody] ChangeDeploymentStatusRequest request)
    {
        var result = await _service.ChangeStatusAsync(CurrentUserId, id, request);
        return Ok(ApiResponse<ProductDeploymentDto>.SuccessResponse(result, $"Deployment status updated to {result.CurrentStatus}."));
    }

    [HttpGet("{id:int}/activities")]
    public async Task<IActionResult> GetActivities(int id)
    {
        var result = await _service.GetActivitiesAsync(CurrentUserId, id);
        return Ok(ApiResponse<List<ProductDeploymentActivityDto>>.SuccessResponse(result));
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportDeployments([FromQuery] ProductDeploymentFilter filter)
    {
        var bytes = await _service.ExportToExcelAsync(CurrentUserId, filter);
        var fileName = $"OLMS_Product_Deployment_History_{DateTime.UtcNow:yyyyMMddHHmmss}.xlsx";
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpGet("meta/authorized-products")]
    public async Task<IActionResult> GetAuthorizedProductsAndClients()
    {
        var result = await _service.GetAuthorizedProductsAndClientsAsync(CurrentUserId);
        return Ok(ApiResponse<List<AuthorizedProductOptionDto>>.SuccessResponse(result));
    }

    [HttpGet("admin/employee-access")]
    [RequirePermission("Employee.View", "MasterData.Manage")]
    public async Task<IActionResult> GetEmployeeProductAccessList()
    {
        var result = await _service.GetEmployeeProductAccessListAsync();
        return Ok(ApiResponse<List<EmployeeProductAccessDto>>.SuccessResponse(result));
    }

    [HttpPut("admin/employee-access/{employeeId:int}")]
    [RequirePermission("MasterData.Manage", "Employee.Edit")]
    public async Task<IActionResult> UpdateEmployeeProductAccess(int employeeId, [FromBody] UpdateEmployeeProductAccessRequest request)
    {
        request.EmployeeId = employeeId;
        var result = await _service.UpdateEmployeeProductAccessAsync(request, CurrentUserId);
        return Ok(ApiResponse<EmployeeProductAccessDto>.SuccessResponse(result, "Employee product access updated successfully."));
    }
}
