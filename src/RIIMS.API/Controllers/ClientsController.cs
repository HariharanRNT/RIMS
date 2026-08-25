using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Client;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly IClientService _service;

    public ClientsController(IClientService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<List<ClientDto>>.SuccessResponse(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null) return NotFound(ApiResponse.FailResponse("Client not found."));
        return Ok(ApiResponse<ClientDto>.SuccessResponse(result));
    }

    [HttpPost]
    [RequirePermission("MasterData.Manage")]
    public async Task<IActionResult> Create([FromBody] CreateClientRequest request)
    {
        var result = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, ApiResponse<ClientDto>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [RequirePermission("MasterData.Manage")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClientRequest request)
    {
        var result = await _service.UpdateAsync(id, request);
        return Ok(ApiResponse<ClientDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [RequirePermission("MasterData.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Client deleted."));
    }
}
