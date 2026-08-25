using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Task;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService _service;
    private readonly ICurrentUserService _currentUser;

    public TasksController(ITaskService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartTaskRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.StartTaskAsync(employeeId, request);
        return Ok(ApiResponse<TaskDto>.SuccessResponse(result));
    }

    [HttpPost("assign")]
    public async Task<IActionResult> Assign([FromBody] AssignTaskRequest request)
    {
        var currentUserId = GetEmployeeId();
        var role = await _currentUser.HasPermissionAsync("Task.Assign") ? "Admin" : (_currentUser.Role ?? "Employee");
        var result = await _service.AssignTaskAsync(currentUserId, role, request);
        return Ok(ApiResponse<TaskDto>.SuccessResponse(result, "Task assigned successfully."));
    }

    [HttpPost("{id}/start-assigned")]
    public async Task<IActionResult> StartAssigned(int id, [FromBody] StartAssignedTaskRequest? request = null)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.StartAssignedTaskAsync(id, employeeId, request);
        return Ok(ApiResponse<TaskDto>.SuccessResponse(result, "Assigned task started."));
    }

    [HttpPost("{id}/hold")]
    public async Task<IActionResult> Hold(int id, [FromBody] TaskActionRequest? request = null)
    {
        var employeeId = GetEmployeeId();
        await _service.HoldTaskAsync(id, employeeId, request);
        return Ok(ApiResponse.SuccessResponse("Task put on hold."));
    }

    [HttpPost("{id}/resume")]
    public async Task<IActionResult> Resume(int id, [FromBody] TaskActionRequest? request = null)
    {
        var employeeId = GetEmployeeId();
        await _service.ResumeTaskAsync(id, employeeId, request);
        return Ok(ApiResponse.SuccessResponse("Task resumed."));
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id, [FromBody] TaskActionRequest? request = null)
    {
        var employeeId = GetEmployeeId();
        await _service.CompleteTaskAsync(id, employeeId, request);
        return Ok(ApiResponse.SuccessResponse("Task completed."));
    }

    [HttpGet("active/{employeeId}")]
    public async Task<IActionResult> GetActive(int employeeId)
    {
        // Strict IDOR Check
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("Task.View"))
        {
            return Forbid();
        }

        var result = await _service.GetActiveTaskAsync(employeeId);
        return Ok(ApiResponse<ActiveTaskDto?>.SuccessResponse(result));
    }

    [HttpGet("history/{employeeId}")]
    public async Task<IActionResult> GetHistory(int employeeId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        // Strict IDOR Check
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("Task.View"))
        {
            return Forbid();
        }

        var result = await _service.GetTaskHistoryAsync(employeeId, from, to);
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(result));
    }

    [HttpGet("assigned/{employeeId}")]
    public async Task<IActionResult> GetAssignedTasks(int employeeId)
    {
        // Strict IDOR Check
        if (_currentUser.EmployeeId != employeeId && !await _currentUser.HasPermissionAsync("Task.View"))
        {
            return Forbid();
        }

        var result = await _service.GetAssignedTasksForEmployeeAsync(employeeId);
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(result));
    }

    [HttpGet("team-employees")]
    public async Task<IActionResult> GetMyTeamEmployees()
    {
        var currentUserId = GetEmployeeId();
        var result = await _service.GetMyTeamEmployeesAsync(currentUserId);
        return Ok(ApiResponse<List<TeamEmployeeDto>>.SuccessResponse(result));
    }

    [HttpGet("team-tasks")]
    public async Task<IActionResult> GetMyTeamTasks([FromQuery] TeamTaskQueryDto query)
    {
        var currentUserId = GetEmployeeId();
        var result = await _service.GetMyTeamTasksAsync(currentUserId, query);
        return Ok(ApiResponse<PagedResult<TaskDto>>.SuccessResponse(result));
    }

    [HttpGet("admin-all")]
    [RequirePermission("Task.View")]
    public async Task<IActionResult> GetAdminTasks(
        [FromQuery] int? employeeId,
        [FromQuery] int? departmentId,
        [FromQuery] int? managerId,
        [FromQuery] string? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] bool? isOverdue)
    {
        var result = await _service.GetAdminTasksAsync(employeeId, departmentId, managerId, status, from, to, isOverdue);
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(result));
    }

    [HttpPost("{id}/reassign")]
    public async Task<IActionResult> Reassign(int id, [FromBody] ReassignTaskRequest request)
    {
        var currentUserId = GetEmployeeId();
        var role = await _currentUser.HasPermissionAsync("Task.Assign") ? "Admin" : (_currentUser.Role ?? "Employee");
        var result = await _service.ReassignTaskAsync(id, currentUserId, role, request);
        return Ok(ApiResponse<TaskDto>.SuccessResponse(result, "Task reassigned successfully."));
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] CancelTaskRequest request)
    {
        var currentUserId = GetEmployeeId();
        var role = await _currentUser.HasPermissionAsync("Task.Delete") ? "Admin" : (_currentUser.Role ?? "Employee");
        await _service.CancelTaskAsync(id, currentUserId, role, request);
        return Ok(ApiResponse.SuccessResponse("Task cancelled successfully."));
    }

    [HttpGet("{id}/timeline")]
    public async Task<IActionResult> GetTimeline(int id)
    {
        var currentUserId = GetEmployeeId();
        var role = await _currentUser.HasPermissionAsync("Task.View") ? "Admin" : (_currentUser.Role ?? "Employee");
        var result = await _service.GetTaskTimelineAsync(id, currentUserId, role);
        return Ok(ApiResponse<List<TaskTimelineEventDto>>.SuccessResponse(result));
    }

    private int GetEmployeeId()
    {
        return _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID claim missing from token.");
    }
}
