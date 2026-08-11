using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Break;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BreaksController : ControllerBase
{
    private readonly IBreakService _service;
    private readonly ICurrentUserService _currentUser;

    public BreaksController(IBreakService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartBreakRequest request)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.StartBreakAsync(employeeId, request);
        return Ok(ApiResponse<BreakLogDto>.SuccessResponse(result));
    }

    [HttpPost("{id}/stop")]
    public async Task<IActionResult> Stop(int id)
    {
        var employeeId = GetEmployeeId();
        var result = await _service.StopBreakAsync(id, employeeId);
        return Ok(ApiResponse<BreakLogDto>.SuccessResponse(result));
    }

    [HttpGet("active/{employeeId}")]
    public async Task<IActionResult> GetActive(int employeeId)
    {
        var result = await _service.GetActiveBreakAsync(employeeId);
        return Ok(ApiResponse<BreakLogDto?>.SuccessResponse(result));
    }

    private int GetEmployeeId()
    {
        return _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID claim missing from token.");
    }
}
