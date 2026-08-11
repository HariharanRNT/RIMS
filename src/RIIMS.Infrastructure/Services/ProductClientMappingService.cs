using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.ProductClientMapping;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class ProductClientMappingService : IProductClientMappingService
{
    private readonly RiimsDbContext _context;

    public ProductClientMappingService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductClientMappingDto>> GetAllAsync(int? clientId = null, int? productId = null)
    {
        var query = _context.ProductClientMappings
            .Include(m => m.Product)
            .Include(m => m.Client)
            .AsQueryable();

        if (clientId.HasValue)
            query = query.Where(m => m.ClientId == clientId.Value);

        if (productId.HasValue)
            query = query.Where(m => m.ProductId == productId.Value);

        var items = await query.ToListAsync();

        return items.Select(m => new ProductClientMappingDto
        {
            Id = m.Id,
            ProductId = m.ProductId,
            ProductName = m.Product.Name,
            ProductCode = m.Product.Code,
            ClientId = m.ClientId,
            ClientCompanyName = m.Client.CompanyName,
            ClientCustomerName = m.Client.CustomerName,
            IsActive = m.IsActive
        }).ToList();
    }

    public async Task<ProductClientMappingDto> CreateAsync(CreateMappingRequest request)
    {
        var exists = await _context.ProductClientMappings
            .AnyAsync(m => m.ProductId == request.ProductId && m.ClientId == request.ClientId);

        if (exists)
            throw new InvalidOperationException("This Product-Client mapping already exists.");

        var mapping = new ProductClientMapping
        {
            ProductId = request.ProductId,
            ClientId = request.ClientId
        };

        _context.ProductClientMappings.Add(mapping);
        await _context.SaveChangesAsync();

        return (await GetAllAsync(request.ClientId, request.ProductId)).First(m => m.Id == mapping.Id);
    }

    public async Task DeleteAsync(int id)
    {
        var mapping = await _context.ProductClientMappings.FindAsync(id);
        if (mapping != null)
        {
            mapping.IsActive = false;
            await _context.SaveChangesAsync();
        }
    }
}
