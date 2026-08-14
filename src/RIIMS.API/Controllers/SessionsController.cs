using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Session;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;
    private readonly ICurrentUserService _currentUser;

    public SessionsController(ISessionService sessionService, ICurrentUserService currentUser)
    {
        _sessionService = sessionService;
        _currentUser = currentUser;
    }

    [HttpPost("heartbeat")]
    public async Task<IActionResult> Heartbeat()
    {
        var sessionIdStr = User.FindFirst("sessionId")?.Value;
        if (Guid.TryParse(sessionIdStr, out var sessionId))
        {
            await _sessionService.UpdateHeartbeatAsync(sessionId);
        }
        return Ok(ApiResponse.SuccessResponse("Heartbeat received."));
    }

    [HttpGet("current-state")]
    public async Task<IActionResult> GetCurrentState()
    {
        var employeeId = _currentUser.EmployeeId
            ?? throw new InvalidOperationException("Employee ID not found in token.");

        var state = await _sessionService.GetCurrentServerStateAsync(employeeId);
        return Ok(ApiResponse<CurrentServerStateDto>.SuccessResponse(state));
    }
}
