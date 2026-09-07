using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly ISystemSettingService _service;

    public SettingsController(ISystemSettingService service)
    {
        _service = service;
    }

    [HttpGet]
    [RequirePermission("Settings.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<List<SystemSettingDto>>.SuccessResponse(result));
    }

    [HttpGet("{key}")]
    [RequirePermission("Settings.View")]
    public async Task<IActionResult> GetByKey(string key)
    {
        var result = await _service.GetByKeyAsync(key);
        if (result == null) return NotFound(ApiResponse.FailResponse($"Setting '{key}' not found."));
        return Ok(ApiResponse<SystemSettingDto>.SuccessResponse(result));
    }

    [HttpPut("{key}")]
    [RequirePermission("Settings.Edit")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
    {
        var result = await _service.UpdateAsync(key, request);
        return Ok(ApiResponse<SystemSettingDto>.SuccessResponse(result));
    }

    /// <summary>
    /// Returns only task reminder settings. Accessible to any authenticated user (no Settings.View required).
    /// </summary>
    [HttpGet("task-reminders")]
    public async Task<IActionResult> GetTaskReminderSettings()
    {
        var result = await _service.GetTaskReminderSettingsAsync();
        return Ok(ApiResponse<TaskReminderSettingsDto>.SuccessResponse(result));
    }

    /// <summary>
    /// Returns only idle notification settings. Accessible to any authenticated user (no Settings.View required).
    /// </summary>
    [HttpGet("idle-notifications")]
    public async Task<IActionResult> GetIdleNotificationSettings()
    {
        var result = await _service.GetIdleNotificationSettingsAsync();
        return Ok(ApiResponse<IdleNotificationSettingsDto>.SuccessResponse(result));
    }
}
