using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Timeline;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimelineController : ControllerBase
{
    private readonly ITimelineService _service;
    private readonly ICurrentUserService _currentUser;

    public TimelineController(ITimelineService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    [HttpGet("{employeeId}")]
    public async Task<IActionResult> GetTimeline(int employeeId, [FromQuery] DateTime? date)
    {
        if (!_currentUser.IsAdmin && _currentUser.EmployeeId != employeeId)
        {
            return Forbid();
        }

        var targetDate = date ?? DateTime.UtcNow.Date;
        var result = await _service.GetTimelineAsync(employeeId, targetDate);
        return Ok(ApiResponse<List<ActivityTimelineDto>>.SuccessResponse(result));
    }
}
