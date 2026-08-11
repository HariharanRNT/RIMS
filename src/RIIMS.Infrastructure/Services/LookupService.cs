using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Lookup;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Common;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class LookupService<TEntity> : ILookupService<TEntity> where TEntity : BaseEntity, new()
{
    private readonly RiimsDbContext _context;

    public LookupService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<List<LookupDto>> GetAllAsync()
    {
        var entities = await _context.Set<TEntity>().ToListAsync();
        return entities.Select(e => new LookupDto
        {
            Id = e.Id,
            Name = GetName(e),
            IsActive = e.IsActive
        }).ToList();
    }

    public async Task<LookupDto?> GetByIdAsync(int id)
    {
        var entity = await _context.Set<TEntity>().FindAsync(id);
        if (entity == null) return null;

        return new LookupDto
        {
            Id = entity.Id,
            Name = GetName(entity),
            IsActive = entity.IsActive
        };
    }

    public async Task<LookupDto> CreateAsync(CreateLookupRequest request)
    {
        var entity = new TEntity();
        SetName(entity, request.Name);

        _context.Set<TEntity>().Add(entity);
        await _context.SaveChangesAsync();

        return new LookupDto
        {
            Id = entity.Id,
            Name = request.Name,
            IsActive = entity.IsActive
        };
    }

    public async Task<LookupDto> UpdateAsync(int id, UpdateLookupRequest request)
    {
        var entity = await _context.Set<TEntity>().FindAsync(id);
        if (entity == null)
            throw new KeyNotFoundException($"Entity with ID {id} not found.");

        SetName(entity, request.Name);
        await _context.SaveChangesAsync();

        return new LookupDto
        {
            Id = entity.Id,
            Name = request.Name,
            IsActive = entity.IsActive
        };
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.Set<TEntity>().FindAsync(id);
        if (entity != null)
        {
            entity.IsActive = false;
            await _context.SaveChangesAsync();
        }
    }

    private static string GetName(TEntity entity)
    {
        var prop = typeof(TEntity).GetProperty("Name");
        return prop?.GetValue(entity)?.ToString() ?? string.Empty;
    }

    private static void SetName(TEntity entity, string value)
    {
        var prop = typeof(TEntity).GetProperty("Name");
        prop?.SetValue(entity, value);
    }
}
