using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Lookup;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/break-types")]
[Authorize]
public class BreakTypesController : ControllerBase
{
    private readonly ILookupService<BreakType> _service;

    public BreakTypesController(ILookupService<BreakType> service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<List<LookupDto>>.SuccessResponse(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound(ApiResponse.FailResponse("Break type not found."));
        return Ok(ApiResponse<LookupDto>.SuccessResponse(result));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateLookupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(ApiResponse.FailResponse("Break type name is required."));

        if (request.AllowedMinutes.HasValue && request.AllowedMinutes.Value <= 0)
            return BadRequest(ApiResponse.FailResponse("Allowed break time must be greater than 0 minutes."));

        var result = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<LookupDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLookupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(ApiResponse.FailResponse("Break type name is required."));

        if (request.AllowedMinutes.HasValue && request.AllowedMinutes.Value <= 0)
            return BadRequest(ApiResponse.FailResponse("Allowed break time must be greater than 0 minutes."));

        var result = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<LookupDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Break type deleted."));
    }
}
