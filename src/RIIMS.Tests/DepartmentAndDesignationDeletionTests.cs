using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Exceptions;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Repositories;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class DepartmentAndDesignationDeletionTests
{
    private static RiimsDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new RiimsDbContext(options);
    }

    [Fact]
    public async Task DeleteDepartment_WithNoEmployees_Succeeds()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(DeleteDepartment_WithNoEmployees_Succeeds));
        var deptRepo = new Repository<Department>(context);
        var deptService = new DepartmentService(deptRepo, context);

        var dept = new Department { Name = "Empty Department", IsActive = true };
        context.Departments.Add(dept);
        await context.SaveChangesAsync();

        // Act
        await deptService.DeleteAsync(dept.Id);

        // Assert
        var deletedDept = await context.Departments.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == dept.Id);
        Assert.NotNull(deletedDept);
        Assert.False(deletedDept.IsActive);
    }

    [Fact]
    public async Task DeleteDepartment_WithAssignedEmployees_ThrowsConflictException_EmployeesUntouched()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(DeleteDepartment_WithAssignedEmployees_ThrowsConflictException_EmployeesUntouched));
        var deptRepo = new Repository<Department>(context);
        var deptService = new DepartmentService(deptRepo, context);

        var dept = new Department { Name = "Engineering", IsActive = true };
        var desig = new Designation { Name = "Software Engineer", IsActive = true };
        context.Departments.Add(dept);
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp1 = new Employee
        {
            EmployeeCode = "EMP001",
            Name = "Alice Smith",
            Email = "alice@example.com",
            DepartmentId = dept.Id,
            DesignationId = desig.Id,
            IsActive = true
        };
        var emp2 = new Employee
        {
            EmployeeCode = "EMP002",
            Name = "Bob Jones",
            Email = "bob@example.com",
            DepartmentId = dept.Id,
            DesignationId = desig.Id,
            IsActive = true
        };
        context.Employees.AddRange(emp1, emp2);
        await context.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => deptService.DeleteAsync(dept.Id));
        Assert.Equal("Cannot delete this department — 2 employee(s) are currently assigned to it. Please reassign or remove them first.", ex.Message);

        // Verify Department is still active and employees are untouched in DB
        var deptInDb = await context.Departments.FindAsync(dept.Id);
        Assert.NotNull(deptInDb);
        Assert.True(deptInDb.IsActive);

        var employeesInDb = await context.Employees.Where(e => e.DepartmentId == dept.Id).ToListAsync();
        Assert.Equal(2, employeesInDb.Count);
        Assert.All(employeesInDb, e => Assert.True(e.IsActive));
    }

    [Fact]
    public async Task DeleteDepartment_NotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(DeleteDepartment_NotFound_ThrowsKeyNotFoundException));
        var deptRepo = new Repository<Department>(context);
        var deptService = new DepartmentService(deptRepo, context);

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => deptService.DeleteAsync(999));
    }

    [Fact]
    public async Task DeleteDesignation_WithNoEmployees_Succeeds()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(DeleteDesignation_WithNoEmployees_Succeeds));
        var desigRepo = new Repository<Designation>(context);
        var desigService = new DesignationService(desigRepo, context);

        var desig = new Designation { Name = "Unassigned Role", IsActive = true };
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        // Act
        await desigService.DeleteAsync(desig.Id);

        // Assert
        var deletedDesig = await context.Designations.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Id == desig.Id);
        Assert.NotNull(deletedDesig);
        Assert.False(deletedDesig.IsActive);
    }

    [Fact]
    public async Task DeleteDesignation_WithAssignedEmployees_ThrowsConflictException_EmployeesUntouched()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(DeleteDesignation_WithAssignedEmployees_ThrowsConflictException_EmployeesUntouched));
        var desigRepo = new Repository<Designation>(context);
        var desigService = new DesignationService(desigRepo, context);

        var dept = new Department { Name = "Marketing", IsActive = true };
        var desig = new Designation { Name = "Brand Specialist", IsActive = true };
        context.Departments.Add(dept);
        context.Designations.Add(desig);
        await context.SaveChangesAsync();

        var emp1 = new Employee
        {
            EmployeeCode = "EMP003",
            Name = "Charlie Brown",
            Email = "charlie@example.com",
            DepartmentId = dept.Id,
            DesignationId = desig.Id,
            IsActive = true
        };
        context.Employees.Add(emp1);
        await context.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ConflictException>(() => desigService.DeleteAsync(desig.Id));
        Assert.Equal("Cannot delete this designation — 1 employee(s) are currently assigned to it. Please reassign or remove them first.", ex.Message);

        // Verify Designation is still active and employee is untouched
        var desigInDb = await context.Designations.FindAsync(desig.Id);
        Assert.NotNull(desigInDb);
        Assert.True(desigInDb.IsActive);

        var empInDb = await context.Employees.FindAsync(emp1.Id);
        Assert.NotNull(empInDb);
        Assert.True(empInDb.IsActive);
        Assert.Equal(desig.Id, empInDb.DesignationId);
    }

    [Fact]
    public async Task DeleteDesignation_NotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryContext(nameof(DeleteDesignation_NotFound_ThrowsKeyNotFoundException));
        var desigRepo = new Repository<Designation>(context);
        var desigService = new DesignationService(desigRepo, context);

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => desigService.DeleteAsync(999));
    }
}
