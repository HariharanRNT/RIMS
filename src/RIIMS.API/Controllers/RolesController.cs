using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Role;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IPermissionManagementService _permissionManagementService;
    private readonly ICurrentUserService _currentUser;

    public RolesController(
        IPermissionManagementService permissionManagementService,
        ICurrentUserService currentUser)
    {
        _permissionManagementService = permissionManagementService;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission("Role.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _permissionManagementService.GetAllRolesAsync();
        return Ok(ApiResponse<List<RoleDto>>.SuccessResponse(result));
    }

    [HttpGet("{id}")]
    [RequirePermission("Role.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _permissionManagementService.GetRoleByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponse.FailResponse($"Role with ID {id} not found."));

        return Ok(ApiResponse<RoleDto>.SuccessResponse(result));
    }

    [HttpPost]
    [RequirePermission("Role.Create")]
    public async Task<IActionResult> Create([FromBody] CreateRoleRequest request)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        var result = await _permissionManagementService.CreateRoleAsync(request, currentUserId);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<RoleDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [RequirePermission("Role.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRoleRequest request)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        var result = await _permissionManagementService.UpdateRoleAsync(id, request, currentUserId);
        return Ok(ApiResponse<RoleDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [RequirePermission("Role.Edit")]
    public async Task<IActionResult> Delete(int id)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        await _permissionManagementService.DeleteRoleAsync(id, currentUserId);
        return Ok(ApiResponse.SuccessResponse("Role deleted successfully."));
    }

    [HttpGet("{id}/permissions")]
    [RequirePermission("Role.View")]
    public async Task<IActionResult> GetPermissions(int id)
    {
        var result = await _permissionManagementService.GetRolePermissionsAsync(id);
        return Ok(ApiResponse<RolePermissionsDto>.SuccessResponse(result));
    }

    [HttpPut("{id}/permissions")]
    [RequirePermission("Role.Assign")]
    public async Task<IActionResult> UpdatePermissions(int id, [FromBody] UpdateRolePermissionsRequest request)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        var result = await _permissionManagementService.UpdateRolePermissionsAsync(id, request, currentUserId);
        return Ok(ApiResponse<RolePermissionsDto>.SuccessResponse(result));
    }
}
