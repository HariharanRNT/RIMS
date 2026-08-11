using RIIMS.Application.DTOs.Department;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;

namespace RIIMS.Infrastructure.Services;

public class DepartmentService : IDepartmentService
{
    private readonly IRepository<Department> _repository;

    public DepartmentService(IRepository<Department> repository)
    {
        _repository = repository;
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
        await _repository.SoftDeleteAsync(id);
    }
}
