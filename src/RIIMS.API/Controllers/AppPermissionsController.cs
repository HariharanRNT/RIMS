using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Permission;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/app-permissions")]
[Authorize]
public class AppPermissionsController : ControllerBase
{
    private readonly IPermissionManagementService _permissionManagementService;

    public AppPermissionsController(IPermissionManagementService permissionManagementService)
    {
        _permissionManagementService = permissionManagementService;
    }

    [HttpGet]
    [RequirePermission("Role.View", "SystemPermission.View", "Role.Assign")]
    public async Task<IActionResult> GetAllGrouped()
    {
        var result = await _permissionManagementService.GetPermissionsGroupedByModuleAsync();
        return Ok(ApiResponse<List<ModulePermissionsDto>>.SuccessResponse(result));
    }

    [HttpGet("flat")]
    [RequirePermission("Role.View", "SystemPermission.View", "Role.Assign")]
    public async Task<IActionResult> GetAllFlat()
    {
        var result = await _permissionManagementService.GetAllPermissionsAsync();
        return Ok(ApiResponse<List<AppPermissionDto>>.SuccessResponse(result));
    }
}
