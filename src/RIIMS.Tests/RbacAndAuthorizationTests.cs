using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RIIMS.Application.DTOs.Role;
using RIIMS.Application.DTOs.User;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class RbacAndAuthorizationTests
{
    private RiimsDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: $"Riims_Rbac_Test_{Guid.NewGuid()}")
            .Options;

        return new RiimsDbContext(options);
    }

    private (UserManager<ApplicationUser>, RoleManager<ApplicationRole>) CreateIdentityManagers(RiimsDbContext context)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
        {
            options.User.RequireUniqueEmail = false;
        })
        .AddEntityFrameworkStores<RiimsDbContext>()
        .AddDefaultTokenProviders();

        services.AddScoped(_ => context);

        var serviceProvider = services.BuildServiceProvider();
        var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = serviceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

        return (userManager, roleManager);
    }

    [Fact]
    public async Task MultiRoleUser_CombinesPermissionsFromAllAssignedRoles()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        var permService = new PermissionManagementService(context, userManager, roleManager);

        // Seed Permissions
        var perm1 = new Permission { Code = "Employee.View", Name = "View Employees", Module = "Employee", IsActive = true };
        var perm2 = new Permission { Code = "Employee.Create", Name = "Create Employee", Module = "Employee", IsActive = true };
        var perm3 = new Permission { Code = "Attendance.View", Name = "View Attendance", Module = "Attendance", IsActive = true };
        var perm4 = new Permission { Code = "Payroll.View", Name = "View Payroll", Module = "Payroll", IsActive = true };
        context.Permissions.AddRange(perm1, perm2, perm3, perm4);
        await context.SaveChangesAsync();

        // Seed Roles
        var hrRole = new ApplicationRole { Name = "HR Admin", IsActive = true };
        var attRole = new ApplicationRole { Name = "Attendance Admin", IsActive = true };
        await roleManager.CreateAsync(hrRole);
        await roleManager.CreateAsync(attRole);

        // Map Permissions
        context.RolePermissions.AddRange(
            new RolePermission { RoleId = hrRole.Id, PermissionId = perm1.Id },
            new RolePermission { RoleId = hrRole.Id, PermissionId = perm2.Id },
            new RolePermission { RoleId = attRole.Id, PermissionId = perm3.Id }
        );
        await context.SaveChangesAsync();

        // Create User with Both Roles
        var user = new ApplicationUser { UserName = "kumar@riims.local", Email = "kumar@riims.local", IsActive = true };
        await userManager.CreateAsync(user, "Password@123");
        await userManager.AddToRoleAsync(user, "HR Admin");
        await userManager.AddToRoleAsync(user, "Attendance Admin");

        // Act
        var userPermissions = await permService.GetUserPermissionCodesAsync(user.Id);

        // Assert
        Assert.Contains("Employee.View", userPermissions);
        Assert.Contains("Employee.Create", userPermissions);
        Assert.Contains("Attendance.View", userPermissions);
        Assert.DoesNotContain("Payroll.View", userPermissions);
    }

    [Fact]
    public async Task SuperAdminUser_HasAccessToAllActivePermissions()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        var permService = new PermissionManagementService(context, userManager, roleManager);

        var perm1 = new Permission { Code = "Employee.View", Name = "View Employees", Module = "Employee", IsActive = true };
        var perm2 = new Permission { Code = "Payroll.Approve", Name = "Approve Payroll", Module = "Payroll", IsActive = true };
        var perm3 = new Permission { Code = "Settings.Edit", Name = "Edit Settings", Module = "Settings", IsActive = true };
        context.Permissions.AddRange(perm1, perm2, perm3);
        await context.SaveChangesAsync();

        var superRole = new ApplicationRole { Name = "Super Admin", IsSystemRole = true, IsProtected = true, IsActive = true };
        await roleManager.CreateAsync(superRole);

        var superUser = new ApplicationUser { UserName = "admin@riims.local", Email = "admin@riims.local", IsActive = true };
        await userManager.CreateAsync(superUser, "SuperSecret@123");
        await userManager.AddToRoleAsync(superUser, "Super Admin");

        // Act
        var permissions = await permService.GetUserPermissionCodesAsync(superUser.Id);

        // Assert
        Assert.Contains("Employee.View", permissions);
        Assert.Contains("Payroll.Approve", permissions);
        Assert.Contains("Settings.Edit", permissions);
        Assert.Equal(3, permissions.Count);
    }

    [Fact]
    public async Task DeactivatedUser_ReturnsNoPermissions()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        var permService = new PermissionManagementService(context, userManager, roleManager);

        var perm = new Permission { Code = "Employee.View", Name = "View Employees", Module = "Employee", IsActive = true };
        context.Permissions.Add(perm);
        await context.SaveChangesAsync();

        var hrRole = new ApplicationRole { Name = "HR Admin", IsActive = true };
        await roleManager.CreateAsync(hrRole);

        context.RolePermissions.Add(new RolePermission { RoleId = hrRole.Id, PermissionId = perm.Id });
        await context.SaveChangesAsync();

        var user = new ApplicationUser { UserName = "inactive@riims.local", Email = "inactive@riims.local", IsActive = false };
        await userManager.CreateAsync(user, "Password@123");
        await userManager.AddToRoleAsync(user, "HR Admin");

        // Act
        var permissions = await permService.GetUserPermissionCodesAsync(user.Id);

        // Assert
        Assert.Empty(permissions);
    }

    [Fact]
    public async Task NonSuperAdmin_CannotAssignSuperAdminRole()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        var permService = new PermissionManagementService(context, userManager, roleManager);

        var superRole = new ApplicationRole { Name = "Super Admin", IsSystemRole = true, IsProtected = true, IsActive = true };
        await roleManager.CreateAsync(superRole);

        var request = new CreateUserRequest
        {
            Email = "newadmin@riims.local",
            Username = "newadmin",
            Password = "Password@123",
            Roles = new List<string> { "Super Admin" }
        };

        // Act & Assert (isCurrentSuperAdmin = false)
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            permService.CreateAdminUserAsync(request, currentUserId: 99, isCurrentSuperAdmin: false));
    }

    [Fact]
    public async Task LastSuperAdmin_CannotBeDeactivated()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        var permService = new PermissionManagementService(context, userManager, roleManager);

        var superRole = new ApplicationRole { Name = "Super Admin", IsSystemRole = true, IsProtected = true, IsActive = true };
        await roleManager.CreateAsync(superRole);

        var superUser = new ApplicationUser { UserName = "super@riims.local", Email = "super@riims.local", IsActive = true };
        await userManager.CreateAsync(superUser, "Password@123");
        await userManager.AddToRoleAsync(superUser, "Super Admin");

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            permService.SetUserActiveStatusAsync(superUser.Id, isActive: false, currentUserId: superUser.Id));
    }

    [Fact]
    public async Task ProtectedRole_CannotBeDeleted()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        var permService = new PermissionManagementService(context, userManager, roleManager);

        var superRole = new ApplicationRole { Name = "Super Admin", IsSystemRole = true, IsProtected = true, IsActive = true };
        await roleManager.CreateAsync(superRole);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            permService.DeleteRoleAsync(superRole.Id, currentUserId: 1));
    }
}
