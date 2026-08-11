using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    [HttpPost("{id}/hold")]
    public async Task<IActionResult> Hold(int id)
    {
        var employeeId = GetEmployeeId();
        await _service.HoldTaskAsync(id, employeeId);
        return Ok(ApiResponse.SuccessResponse("Task put on hold."));
    }

    [HttpPost("{id}/resume")]
    public async Task<IActionResult> Resume(int id)
    {
        var employeeId = GetEmployeeId();
        await _service.ResumeTaskAsync(id, employeeId);
        return Ok(ApiResponse.SuccessResponse("Task resumed."));
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(int id)
    {
        var employeeId = GetEmployeeId();
        await _service.CompleteTaskAsync(id, employeeId);
        return Ok(ApiResponse.SuccessResponse("Task completed."));
    }

    [HttpGet("active/{employeeId}")]
    public async Task<IActionResult> GetActive(int employeeId)
    {
        var result = await _service.GetActiveTaskAsync(employeeId);
        return Ok(ApiResponse<ActiveTaskDto?>.SuccessResponse(result));
    }

    [HttpGet("history/{employeeId}")]
    public async Task<IActionResult> GetHistory(int employeeId, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var result = await _service.GetTaskHistoryAsync(employeeId, from, to);
        return Ok(ApiResponse<List<TaskDto>>.SuccessResponse(result));
    }

    private int GetEmployeeId()
    {
        return _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID claim missing from token.");
    }
}
