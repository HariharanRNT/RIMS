using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Product;
using RIIMS.Application.Exceptions;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly IRepository<Product> _repository;
    private readonly RiimsDbContext _context;

    public ProductService(IRepository<Product> repository, RiimsDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<List<ProductDto>> GetAllAsync()
    {
        var items = await _repository.GetAllAsync();
        return items.Select(p => new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Code = p.Code,
            IsActive = p.IsActive
        }).ToList();
    }

    public async Task<ProductDto?> GetByIdAsync(int id)
    {
        var p = await _repository.GetByIdAsync(id);
        if (p == null) return null;

        return new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Code = p.Code,
            IsActive = p.IsActive
        };
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request)
    {
        var uppercaseCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _repository.ExistsAsync(p => p.Code == uppercaseCode);
        if (exists)
            throw new InvalidOperationException($"Product with code '{uppercaseCode}' already exists.");

        var product = new Product
        {
            Name = request.Name,
            Code = uppercaseCode
        };

        await _repository.AddAsync(product);

        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Code = product.Code,
            IsActive = product.IsActive
        };
    }

    public async Task<ProductDto> UpdateAsync(int id, UpdateProductRequest request)
    {
        var product = await _repository.GetByIdAsync(id);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {id} not found.");

        var uppercaseCode = request.Code.Trim().ToUpperInvariant();

        var exists = await _repository.ExistsAsync(p => p.Code == uppercaseCode && p.Id != id);
        if (exists)
            throw new InvalidOperationException($"Product with code '{uppercaseCode}' already exists.");

        product.Name = request.Name;
        product.Code = uppercaseCode;

        await _repository.UpdateAsync(product);

        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Code = product.Code,
            IsActive = product.IsActive
        };
    }

    public async Task DeleteAsync(int id)
    {
        var product = await _repository.GetByIdAsync(id);
        if (product == null)
            throw new KeyNotFoundException($"Product with ID {id} not found.");

        var mappingCount = await _context.ProductClientMappings.CountAsync(m => m.ProductId == id);
        var taskCount = await _context.WorkTasks.CountAsync(t => t.ProductId == id);
        var logCount = await _context.SupportActivityLogs.CountAsync(s => s.ProductId == id);

        if (mappingCount > 0 || taskCount > 0 || logCount > 0)
        {
            throw new ConflictException("Cannot delete this product — it is currently referenced by client mappings, tasks, or activity logs. Please remove those associations first.");
        }

        await _repository.SoftDeleteAsync(id);
    }
}
