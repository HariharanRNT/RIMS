using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Department;
using RIIMS.Application.Exceptions;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class DepartmentService : IDepartmentService
{
    private readonly IRepository<Department> _repository;
    private readonly RiimsDbContext _context;

    public DepartmentService(IRepository<Department> repository, RiimsDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<List<DepartmentDto>> GetAllAsync()
    {
        var departments = await _repository.GetAllAsync();
        return departments.Select(d => new DepartmentDto
        {
            Id = d.Id,
            Name = d.Name,
            IsActive = d.IsActive
        }).ToList();
    }

    public async Task<DepartmentDto?> GetByIdAsync(int id)
    {
        var department = await _repository.GetByIdAsync(id);
        if (department == null) return null;

        return new DepartmentDto
        {
            Id = department.Id,
            Name = department.Name,
            IsActive = department.IsActive
        };
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request)
    {
        var exists = await _repository.ExistsAsync(d => d.Name == request.Name);
        if (exists)
            throw new InvalidOperationException($"Department '{request.Name}' already exists.");

        var department = new Department { Name = request.Name };
        await _repository.AddAsync(department);

        return new DepartmentDto { Id = department.Id, Name = department.Name, IsActive = department.IsActive };
    }

    public async Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentRequest request)
    {
        var department = await _repository.GetByIdAsync(id);
        if (department == null)
            throw new KeyNotFoundException($"Department with Id {id} not found.");

        var exists = await _repository.ExistsAsync(d => d.Name == request.Name && d.Id != id);
        if (exists)
            throw new InvalidOperationException($"Department '{request.Name}' already exists.");

        department.Name = request.Name;
        await _repository.UpdateAsync(department);

        return new DepartmentDto { Id = department.Id, Name = department.Name, IsActive = department.IsActive };
    }

    public async Task DeleteAsync(int id)
    {
        var department = await _repository.GetByIdAsync(id);
        if (department == null)
            throw new KeyNotFoundException($"Department with Id {id} not found.");

        var employeeCount = await _context.Employees
            .IgnoreQueryFilters()
            .CountAsync(e => e.DepartmentId == id && e.IsActive);
        if (employeeCount > 0)
        {
            throw new ConflictException(
                $"Cannot delete this department — {employeeCount} employee(s) are currently assigned to it. Please reassign or remove them first.");
        }

        await _repository.SoftDeleteAsync(id);
    }
}
