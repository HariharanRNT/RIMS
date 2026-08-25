using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Designation;
using RIIMS.Application.Exceptions;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class DesignationService : IDesignationService
{
    private readonly IRepository<Designation> _repository;
    private readonly RiimsDbContext _context;

    public DesignationService(IRepository<Designation> repository, RiimsDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<List<DesignationDto>> GetAllAsync()
    {
        var designations = await _repository.GetAllAsync();
        return designations.Select(d => new DesignationDto
        {
            Id = d.Id, Name = d.Name, IsActive = d.IsActive
        }).ToList();
    }

    public async Task<DesignationDto?> GetByIdAsync(int id)
    {
        var designation = await _repository.GetByIdAsync(id);
        if (designation == null) return null;
        return new DesignationDto { Id = designation.Id, Name = designation.Name, IsActive = designation.IsActive };
    }

    public async Task<DesignationDto> CreateAsync(CreateDesignationRequest request)
    {
        var exists = await _repository.ExistsAsync(d => d.Name == request.Name);
        if (exists) throw new InvalidOperationException($"Designation '{request.Name}' already exists.");

        var designation = new Designation { Name = request.Name };
        await _repository.AddAsync(designation);
        return new DesignationDto { Id = designation.Id, Name = designation.Name, IsActive = designation.IsActive };
    }

    public async Task<DesignationDto> UpdateAsync(int id, UpdateDesignationRequest request)
    {
        var designation = await _repository.GetByIdAsync(id);
        if (designation == null) throw new KeyNotFoundException($"Designation with Id {id} not found.");

        var exists = await _repository.ExistsAsync(d => d.Name == request.Name && d.Id != id);
        if (exists) throw new InvalidOperationException($"Designation '{request.Name}' already exists.");

        designation.Name = request.Name;
        await _repository.UpdateAsync(designation);
        return new DesignationDto { Id = designation.Id, Name = designation.Name, IsActive = designation.IsActive };
    }

    public async Task DeleteAsync(int id)
    {
        var designation = await _repository.GetByIdAsync(id);
        if (designation == null)
            throw new KeyNotFoundException($"Designation with Id {id} not found.");

        var employeeCount = await _context.Employees
            .IgnoreQueryFilters()
            .CountAsync(e => e.DesignationId == id && e.IsActive);
        if (employeeCount > 0)
        {
            throw new ConflictException(
                $"Cannot delete this designation — {employeeCount} employee(s) are currently assigned to it. Please reassign or remove them first.");
        }

        await _repository.SoftDeleteAsync(id);
    }
}
