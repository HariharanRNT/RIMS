using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Settings;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class SettingsController : ControllerBase
{
    private readonly ISystemSettingService _service;

    public SettingsController(ISystemSettingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<List<SystemSettingDto>>.SuccessResponse(result));
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> GetByKey(string key)
    {
        var result = await _service.GetByKeyAsync(key);
        if (result == null) return NotFound(ApiResponse.FailResponse($"Setting '{key}' not found."));
        return Ok(ApiResponse<SystemSettingDto>.SuccessResponse(result));
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
    {
        var result = await _service.UpdateAsync(key, request);
        return Ok(ApiResponse<SystemSettingDto>.SuccessResponse(result));
    }
}
