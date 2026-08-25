using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Leave;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LeavesController : ControllerBase
{
    private readonly ILeaveService _service;
    private readonly ICurrentUserService _currentUser;

    public LeavesController(ILeaveService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("submit")]
    public async Task<IActionResult> Submit([FromBody] CreateLeaveRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.SubmitLeaveAsync(employeeId, request);
        return Ok(ApiResponse<LeaveRequestDto>.SuccessResponse(result));
    }

    [HttpGet("my-requests/{employeeId}")]
    public async Task<IActionResult> GetMyRequests(int employeeId)
    {
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        var result = await _service.GetEmployeeLeavesAsync(employeeId);
        return Ok(ApiResponse<List<LeaveRequestDto>>.SuccessResponse(result));
    }

    [HttpGet("pending-approvals")]
    public async Task<IActionResult> GetPendingApprovals()
    {
        var employeeId = GetEmployeeId();
        var result = await _service.GetPendingApprovalsAsync(employeeId, _currentUser.IsAdmin);
        return Ok(ApiResponse<List<LeaveRequestDto>>.SuccessResponse(result));
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> Approve(int id)
    {
        var approverId = GetEmployeeId();
        await _service.ApproveLeaveAsync(id, approverId);
        return Ok(ApiResponse.SuccessResponse("Leave request approved."));
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(int id)
    {
        var approverId = GetEmployeeId();
        await _service.RejectLeaveAsync(id, approverId);
        return Ok(ApiResponse.SuccessResponse("Leave request rejected."));
    }

    private int GetEmployeeId()
    {
        return _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID claim missing from token.");
    }
}
