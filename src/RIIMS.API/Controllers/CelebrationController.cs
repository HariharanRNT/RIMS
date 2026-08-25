using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Celebration;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/celebrations")]
[Authorize]
public class CelebrationController : ControllerBase
{
    private readonly ICelebrationNotificationService _celebrationService;

    public CelebrationController(ICelebrationNotificationService celebrationService)
    {
        _celebrationService = celebrationService;
    }

    [HttpGet("today")]
    public async Task<IActionResult> GetTodayCelebrations()
    {
        var celebrations = await _celebrationService.GetTodayCelebrationsAsync();
        return Ok(ApiResponse<List<CelebrationFeedDto>>.SuccessResponse(celebrations));
    }

    [HttpPost("trigger-now")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> TriggerNow([FromQuery] bool force = true)
    {
        var result = await _celebrationService.ProcessDailyCelebrationsAsync(force: force);
        return Ok(ApiResponse<CelebrationTriggerResultDto>.SuccessResponse(result));
    }
}
