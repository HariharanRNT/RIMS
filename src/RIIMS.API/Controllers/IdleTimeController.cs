using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/idle")]
[Route("api/[controller]")]
[Authorize]
public class IdleTimeController : ControllerBase
{
    private readonly IIdleTimeService _idleTimeService;
    private readonly ICurrentUserService _currentUserService;

    public IdleTimeController(IIdleTimeService idleTimeService, ICurrentUserService currentUserService)
    {
        _idleTimeService = idleTimeService;
        _currentUserService = currentUserService;
    }

    [HttpGet("current-state")]
    public async Task<IActionResult> GetCurrentState()
    {
        int employeeId = _currentUserService.EmployeeId ?? 0;
        if (employeeId <= 0)
        {
            return Unauthorized(new { success = false, message = "Employee context not found." });
        }

        var state = await _idleTimeService.GetCurrentStateAsync(employeeId);
        return Ok(new { success = true, data = state });
    }
}
