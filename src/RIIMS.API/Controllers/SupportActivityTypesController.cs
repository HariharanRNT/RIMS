using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Lookup;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/support-activity-types")]
[Authorize]
public class SupportActivityTypesController : ControllerBase
{
    private readonly ILookupService<SupportActivityType> _service;

    public SupportActivityTypesController(ILookupService<SupportActivityType> service)
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
        if (result == null) return NotFound(ApiResponse.FailResponse("Support activity type not found."));
        return Ok(ApiResponse<LookupDto>.SuccessResponse(result));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateLookupRequest request)
    {
        var result = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id },
            ApiResponse<LookupDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLookupRequest request)
    {
        var result = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<LookupDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Support activity type deleted."));
    }
}
