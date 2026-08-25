using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RIIMS.API.Attributes;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.ProductClientMapping;
using RIIMS.Application.Interfaces;

namespace RIIMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductClientMappingsController : ControllerBase
{
    private readonly IProductClientMappingService _service;

    public ProductClientMappingsController(IProductClientMappingService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(ApiResponse<List<ProductClientMappingDto>>.SuccessResponse(result));
    }

    [HttpPost]
    [RequirePermission("MasterData.Manage")]
    public async Task<IActionResult> Create([FromBody] CreateMappingRequest request)
    {
        var result = await _service.CreateAsync(request);
        return Ok(ApiResponse<ProductClientMappingDto>.SuccessResponse(result));
    }

    [HttpDelete("{id}")]
    [RequirePermission("MasterData.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _service.DeleteAsync(id);
        return Ok(ApiResponse.SuccessResponse("Mapping deleted."));
    }
}
