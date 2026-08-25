using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Lookup;
using RIIMS.Application.Exceptions;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Common;
using RIIMS.Domain.Entities;
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
            AllowedMinutes = GetAllowedMinutes(e),
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
            AllowedMinutes = GetAllowedMinutes(entity),
            IsActive = entity.IsActive
        };
    }

    public async Task<LookupDto> CreateAsync(CreateLookupRequest request)
    {
        var entity = new TEntity();
        SetName(entity, request.Name);
        if (request.AllowedMinutes.HasValue)
        {
            SetAllowedMinutes(entity, request.AllowedMinutes.Value);
        }

        _context.Set<TEntity>().Add(entity);
        await _context.SaveChangesAsync();

        return new LookupDto
        {
            Id = entity.Id,
            Name = request.Name,
            AllowedMinutes = GetAllowedMinutes(entity),
            IsActive = entity.IsActive
        };
    }

    public async Task<LookupDto> UpdateAsync(int id, UpdateLookupRequest request)
    {
        var entity = await _context.Set<TEntity>().FindAsync(id);
        if (entity == null)
            throw new KeyNotFoundException($"Entity with ID {id} not found.");

        SetName(entity, request.Name);
        if (request.AllowedMinutes.HasValue)
        {
            SetAllowedMinutes(entity, request.AllowedMinutes.Value);
        }
        await _context.SaveChangesAsync();

        return new LookupDto
        {
            Id = entity.Id,
            Name = request.Name,
            AllowedMinutes = GetAllowedMinutes(entity),
            IsActive = entity.IsActive
        };
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.Set<TEntity>().FindAsync(id);
        if (entity == null)
            throw new KeyNotFoundException($"Item with ID {id} not found.");

        if (typeof(TEntity) == typeof(BreakType))
        {
            var count = await _context.BreakLogs.CountAsync(b => b.BreakTypeId == id);
            if (count > 0)
                throw new ConflictException($"Cannot delete this break type — {count} break log(s) are currently associated with it.");
        }
        else if (typeof(TEntity) == typeof(LeaveType))
        {
            var count = await _context.LeaveRequests.CountAsync(l => l.LeaveTypeId == id);
            if (count > 0)
                throw new ConflictException($"Cannot delete this leave type — {count} leave request(s) are currently associated with it.");
        }
        else if (typeof(TEntity) == typeof(SupportActivityType))
        {
            var count = await _context.SupportActivityLogs.CountAsync(s => s.ActivityTypeId == id);
            if (count > 0)
                throw new ConflictException($"Cannot delete this support activity type — {count} activity log(s) are currently associated with it.");
        }

        entity.IsActive = false;
        await _context.SaveChangesAsync();
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

    private static int? GetAllowedMinutes(TEntity entity)
    {
        var prop = typeof(TEntity).GetProperty("AllowedMinutes");
        return prop != null ? (int?)prop.GetValue(entity) : null;
    }

    private static void SetAllowedMinutes(TEntity entity, int value)
    {
        var prop = typeof(TEntity).GetProperty("AllowedMinutes");
        if (prop != null && prop.CanWrite)
        {
            prop.SetValue(entity, value);
        }
    }
}
