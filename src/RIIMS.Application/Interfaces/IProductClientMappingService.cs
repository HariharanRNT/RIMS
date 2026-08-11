using RIIMS.Application.DTOs.ProductClientMapping;

namespace RIIMS.Application.Interfaces;

public interface IProductClientMappingService
{
    Task<List<ProductClientMappingDto>> GetAllAsync(int? clientId = null, int? productId = null);
    Task<ProductClientMappingDto> CreateAsync(CreateMappingRequest request);
    Task DeleteAsync(int id);
}
