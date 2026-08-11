using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.ProductClientMapping;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/mappings")]
[Authorize]
public class ProductClientMappingsController : ControllerBase
{
    private readonly IProductClientMappingService _service;

    public ProductClientMappingsController(IProductClientMappingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? clientId, [FromQuery] int? productId)
    {
        var result = await _service.GetAllAsync(clientId, productId);
        return Ok(ApiResponse<List<ProductClientMappingDto>>.SuccessResponse(result));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMappingRequest request)
    {
        var result = await _service.CreateAsync(request);
        return Ok(ApiResponse<ProductClientMappingDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Mapping removed."));
    }
}
