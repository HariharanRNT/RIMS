using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Permission;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _service;
    private readonly ICurrentUserService _currentUser;

    public PermissionsController(IPermissionService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("submit")]
    public async Task<IActionResult> Submit([FromBody] CreatePermissionRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.SubmitPermissionAsync(employeeId, request);
        return Ok(ApiResponse<PermissionRequestDto>.SuccessResponse(result));
    }

    [HttpGet("my-requests/{employeeId}")]
    public async Task<IActionResult> GetMyRequests(int employeeId)
    {
        // IDOR Defense: only allow self or user with Permission.View permission
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("Permission.View"))
        {
            return Forbid();
        }

        var result = await _service.GetEmployeePermissionsAsync(employeeId);
        return Ok(ApiResponse<List<PermissionRequestDto>>.SuccessResponse(result));
    }

    [HttpGet("pending-approvals")]
    public async Task<IActionResult> GetPendingApprovals()
    {
        var employeeId = GetEmployeeId();
        var canApproveAll = await _currentUser.HasPermissionAsync("Permission.Approve") || await _currentUser.HasPermissionAsync("Permission.View");
        var result = await _service.GetPendingApprovalsAsync(employeeId, canApproveAll);
        return Ok(ApiResponse<List<PermissionRequestDto>>.SuccessResponse(result));
    }

    [HttpPost("{id}/approve")]
    [RequirePermission("Permission.Approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var approverId = GetEmployeeId();
        await _service.ApprovePermissionAsync(id, approverId);
        return Ok(ApiResponse.SuccessResponse("Permission request approved."));
    }

    [HttpPost("{id}/reject")]
    [RequirePermission("Permission.Reject")]
    public async Task<IActionResult> Reject(int id)
    {
        var approverId = GetEmployeeId();
        await _service.RejectPermissionAsync(id, approverId);
        return Ok(ApiResponse.SuccessResponse("Permission request rejected."));
    }

    private int GetEmployeeId()
    {
        return _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID claim missing from token.");
    }
}
