using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.User;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IPermissionManagementService _permissionManagementService;
    private readonly ICurrentUserService _currentUser;

    public UsersController(
        IPermissionManagementService permissionManagementService,
        ICurrentUserService currentUser)
    {
        _permissionManagementService = permissionManagementService;
        _currentUser = currentUser;
    }

    [HttpGet]
    [RequirePermission("User.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _permissionManagementService.GetAllUsersAsync();
        return Ok(ApiResponse<List<UserDto>>.SuccessResponse(result));
    }

    [HttpGet("{id}")]
    [RequirePermission("User.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _permissionManagementService.GetUserByIdAsync(id);
        if (result == null)
            return NotFound(ApiResponse.FailResponse($"User with ID {id} not found."));

        return Ok(ApiResponse<UserDto>.SuccessResponse(result));
    }

    [HttpPost]
    [RequirePermission("User.Create")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        var isSuperAdmin = _currentUser.IsSuperAdmin;

        var result = await _permissionManagementService.CreateAdminUserAsync(request, currentUserId, isSuperAdmin);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<UserDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [RequirePermission("User.Edit")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        var isSuperAdmin = _currentUser.IsSuperAdmin;

        var result = await _permissionManagementService.UpdateAdminUserAsync(id, request, currentUserId, isSuperAdmin);
        return Ok(ApiResponse<UserDto>.SuccessResponse(result));
    }

    [HttpPost("{id}/activate")]
    [RequirePermission("User.Edit")]
    public async Task<IActionResult> Activate(int id)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        await _permissionManagementService.SetUserActiveStatusAsync(id, true, currentUserId);
        return Ok(ApiResponse.SuccessResponse("User activated successfully."));
    }

    [HttpPost("{id}/deactivate")]
    [RequirePermission("User.Deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        await _permissionManagementService.SetUserActiveStatusAsync(id, false, currentUserId);
        return Ok(ApiResponse.SuccessResponse("User deactivated successfully."));
    }

    [HttpPost("{id}/reset-password")]
    [RequirePermission("User.ResetPassword")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] AdminResetPasswordRequest request)
    {
        var currentUserId = _currentUser.UserId ?? 0;
        await _permissionManagementService.AdminResetPasswordAsync(id, request, currentUserId);
        return Ok(ApiResponse.SuccessResponse("Password reset successfully."));
    }
}
