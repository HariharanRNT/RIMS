using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Support;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SupportController : ControllerBase
{
    private readonly ISupportActivityService _service;
    private readonly ICurrentUserService _currentUser;

    public SupportController(ISupportActivityService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartSupportRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.StartSupportAsync(employeeId, request);
        return Ok(ApiResponse<SupportLogDto>.SuccessResponse(result));
    }

    [HttpPost("{id}/stop")]
    public async Task<IActionResult> Stop(int id, [FromBody] StopSupportRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.StopSupportAsync(id, employeeId, request);
        return Ok(ApiResponse<SupportLogDto>.SuccessResponse(result));
    }

    [HttpPost("demo/complete")]
    public async Task<IActionResult> CompleteDemo([FromBody] CompleteDemoRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.CompleteDemoAsync(employeeId, request);
        return Ok(ApiResponse<DemoFollowUpDto>.SuccessResponse(result));
    }

    [HttpGet("demo-followups/my-pending")]
    public async Task<IActionResult> GetMyPendingDemoFollowUps()
    {
        var employeeId = GetEmployeeId();
        var result = await _service.GetMyPendingDemoFollowUpsAsync(employeeId);
        return Ok(ApiResponse<List<DemoFollowUpDto>>.SuccessResponse(result));
    }

    [HttpPost("demo-followups/{id}/complete")]
    public async Task<IActionResult> CompleteDemoFollowUp(int id)
    {
        var employeeId = GetEmployeeId();
        await _service.CompleteDemoFollowUpAsync(id, employeeId);
        return Ok(ApiResponse.SuccessResponse("Demo follow-up marked as completed."));
    }

    [HttpGet("active/{employeeId}")]
    public async Task<IActionResult> GetActive(int employeeId)
    {
        var result = await _service.GetActiveSupportAsync(employeeId);
        return Ok(ApiResponse<SupportLogDto?>.SuccessResponse(result));
    }

    private int GetEmployeeId()
    {
        return _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID claim missing from token.");
    }
}
