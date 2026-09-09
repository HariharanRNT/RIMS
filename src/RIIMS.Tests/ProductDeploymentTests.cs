using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RIIMS.Application.DTOs.ProductDeployment;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;
using RIIMS.Infrastructure.Services;
using Xunit;

namespace RIIMS.Tests;

public class ProductDeploymentTests
{
    private RiimsDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<RiimsDbContext>()
            .UseInMemoryDatabase(databaseName: $"Riims_Deployment_Test_{Guid.NewGuid()}")
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
    public async Task Employee_CanOnlyView_AssignedProducts()
    {
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        // Seed roles
        await roleManager.CreateAsync(new ApplicationRole { Name = "Employee", IsActive = true });

        // Seed Employees
        var empA = new Employee { Id = 1, Name = "Employee A", Email = "empa@test.com", EmployeeCode = "EMP-001", IsActive = true };
        var empB = new Employee { Id = 2, Name = "Employee B", Email = "empb@test.com", EmployeeCode = "EMP-002", IsActive = true };
        context.Employees.AddRange(empA, empB);

        // Seed Users
        var userA = new ApplicationUser { Id = 101, UserName = empA.Email, Email = empA.Email, EmployeeId = empA.Id, IsActive = true };
        var userB = new ApplicationUser { Id = 102, UserName = empB.Email, Email = empB.Email, EmployeeId = empB.Id, IsActive = true };
        await userManager.CreateAsync(userA, "Pass@123");
        await userManager.CreateAsync(userB, "Pass@123");
        await userManager.AddToRoleAsync(userA, "Employee");
        await userManager.AddToRoleAsync(userB, "Employee");

        // Seed Products
        var olms = new Product { Id = 1, Name = "OLMS", Code = "OLMS", IsActive = true };
        var xyz = new Product { Id = 2, Name = "XYZ", Code = "XYZ", IsActive = true };
        context.Products.AddRange(olms, xyz);

        // Seed Clients
        var clientA = new Client { Id = 1, CompanyName = "Client A", CustomerName = "Rep A", IsActive = true };
        context.Clients.Add(clientA);

        // Map Clients
        context.ProductClientMappings.Add(new ProductClientMapping { ProductId = olms.Id, ClientId = clientA.Id, IsActive = true });
        context.ProductClientMappings.Add(new ProductClientMapping { ProductId = xyz.Id, ClientId = clientA.Id, IsActive = true });

        // Assign OLMS to Employee A only
        context.EmployeeProductAccesses.Add(new EmployeeProductAccess { EmployeeId = empA.Id, ProductId = olms.Id, IsActive = true });

        // Assign XYZ to Employee B only
        context.EmployeeProductAccesses.Add(new EmployeeProductAccess { EmployeeId = empB.Id, ProductId = xyz.Id, IsActive = true });

        // Create Deployments
        var depOLMS = new ProductDeploymentHistory
        {
            Id = 1,
            ProductId = olms.Id,
            ClientId = clientA.Id,
            Issue = "OLMS-101",
            IssueDate = DateTime.UtcNow,
            Description = "OLMS bug",
            DevelopmentProcess = "Fixed",
            CurrentStatus = "New",
            CreatedBy = empA.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var depXYZ = new ProductDeploymentHistory
        {
            Id = 2,
            ProductId = xyz.Id,
            ClientId = clientA.Id,
            Issue = "XYZ-201",
            IssueDate = DateTime.UtcNow,
            Description = "XYZ bug",
            DevelopmentProcess = "Fixed",
            CurrentStatus = "New",
            CreatedBy = empB.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.ProductDeploymentHistories.AddRange(depOLMS, depXYZ);
        await context.SaveChangesAsync();

        var service = new ProductDeploymentService(context, userManager);

        // Act - Query for User A
        var resultA = await service.GetDeploymentsAsync(userA.Id, new ProductDeploymentFilter());

        // Assert - User A must only see OLMS
        Assert.Single(resultA.Items);
        Assert.Equal("OLMS", resultA.Items[0].ProductName);
        Assert.Equal("OLMS-101", resultA.Items[0].Issue);

        // Act - Query for User B
        var resultB = await service.GetDeploymentsAsync(userB.Id, new ProductDeploymentFilter());

        // Assert - User B must only see XYZ
        Assert.Single(resultB.Items);
        Assert.Equal("XYZ", resultB.Items[0].ProductName);
        Assert.Equal("XYZ-201", resultB.Items[0].Issue);
    }

    [Fact]
    public async Task CreateDeployment_Fails_IfClientNotMappedToProduct()
    {
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        await roleManager.CreateAsync(new ApplicationRole { Name = "Employee", IsActive = true });

        var emp = new Employee { Id = 1, Name = "Dev", Email = "dev@test.com", EmployeeCode = "EMP-001", IsActive = true };
        context.Employees.Add(emp);

        var user = new ApplicationUser { Id = 101, UserName = emp.Email, Email = emp.Email, EmployeeId = emp.Id, IsActive = true };
        await userManager.CreateAsync(user, "Pass@123");
        await userManager.AddToRoleAsync(user, "Employee");

        var prod = new Product { Id = 1, Name = "OLMS", Code = "OLMS", IsActive = true };
        var unmappedClient = new Client { Id = 99, CompanyName = "Unmapped Client", CustomerName = "Rep", IsActive = true };
        context.Products.Add(prod);
        context.Clients.Add(unmappedClient);

        context.EmployeeProductAccesses.Add(new EmployeeProductAccess { EmployeeId = emp.Id, ProductId = prod.Id, IsActive = true });
        await context.SaveChangesAsync();

        var service = new ProductDeploymentService(context, userManager);

        var req = new CreateProductDeploymentRequest
        {
            ProductId = prod.Id,
            ClientId = unmappedClient.Id,
            Issue = "TEST-01",
            IssueDate = DateTime.UtcNow,
            Description = "Desc",
            DevelopmentProcess = "Process"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateDeploymentAsync(user.Id, req));
    }

    [Fact]
    public async Task StatusTransition_Reopen_RequiresRemarks_AndResetsTestingFlags()
    {
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        await roleManager.CreateAsync(new ApplicationRole { Name = "Employee", IsActive = true });

        var emp = new Employee { Id = 1, Name = "Dev", Email = "dev@test.com", EmployeeCode = "EMP-001", IsActive = true };
        context.Employees.Add(emp);

        var user = new ApplicationUser { Id = 101, UserName = emp.Email, Email = emp.Email, EmployeeId = emp.Id, IsActive = true };
        await userManager.CreateAsync(user, "Pass@123");
        await userManager.AddToRoleAsync(user, "Employee");

        var prod = new Product { Id = 1, Name = "OLMS", Code = "OLMS", IsActive = true };
        var client = new Client { Id = 1, CompanyName = "Client A", CustomerName = "Rep A", IsActive = true };
        context.Products.Add(prod);
        context.Clients.Add(client);
        context.ProductClientMappings.Add(new ProductClientMapping { ProductId = prod.Id, ClientId = client.Id, IsActive = true });
        context.EmployeeProductAccesses.Add(new EmployeeProductAccess { EmployeeId = emp.Id, ProductId = prod.Id, IsActive = true });

        var deployment = new ProductDeploymentHistory
        {
            Id = 1,
            ProductId = prod.Id,
            ClientId = client.Id,
            Issue = "OLMS-101",
            IssueDate = DateTime.UtcNow,
            Description = "Desc",
            DevelopmentProcess = "Process",
            CurrentStatus = "Testing Completed",
            MovedToTesting = true,
            TestingCompleted = true,
            CreatedBy = emp.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.ProductDeploymentHistories.Add(deployment);
        await context.SaveChangesAsync();

        var service = new ProductDeploymentService(context, userManager);

        // Attempt to reopen without remarks -> must fail
        var failReq = new ChangeDeploymentStatusRequest
        {
            NewStatus = "Development In Progress",
            Remarks = "" // Empty remarks
        };
        await Assert.ThrowsAsync<ArgumentException>(() => service.ChangeStatusAsync(user.Id, deployment.Id, failReq));

        // Reopen with valid remarks
        var successReq = new ChangeDeploymentStatusRequest
        {
            NewStatus = "Development In Progress",
            Remarks = "Found regression bug during final validation"
        };
        var updated = await service.ChangeStatusAsync(user.Id, deployment.Id, successReq);

        // Assert
        Assert.Equal("Development In Progress", updated.CurrentStatus);
        Assert.False(updated.MovedToTesting);
        Assert.False(updated.TestingCompleted);

        var activities = await service.GetActivitiesAsync(user.Id, deployment.Id);
        Assert.Contains(activities, a => a.ActionType == "Reopened" && a.Remarks == "Found regression bug during final validation");
    }

    [Fact]
    public async Task ExportToExcel_GeneratesValidTwoSheetWorkbook()
    {
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        await roleManager.CreateAsync(new ApplicationRole { Name = "Super Admin", IsActive = true });

        var admin = new Employee { Id = 1, Name = "Admin", Email = "admin@test.com", EmployeeCode = "EMP-001", IsActive = true };
        context.Employees.Add(admin);

        var user = new ApplicationUser { Id = 101, UserName = admin.Email, Email = admin.Email, EmployeeId = admin.Id, IsActive = true };
        await userManager.CreateAsync(user, "Pass@123");
        await userManager.AddToRoleAsync(user, "Super Admin");

        var prod = new Product { Id = 1, Name = "OLMS", Code = "OLMS", IsActive = true };
        var client = new Client { Id = 1, CompanyName = "Client A", CustomerName = "Rep A", IsActive = true };
        context.Products.Add(prod);
        context.Clients.Add(client);
        context.ProductClientMappings.Add(new ProductClientMapping { ProductId = prod.Id, ClientId = client.Id, IsActive = true });

        var deployment = new ProductDeploymentHistory
        {
            Id = 1,
            ProductId = prod.Id,
            ClientId = client.Id,
            Issue = "OLMS-101",
            IssueDate = DateTime.UtcNow,
            Description = "Order status fix",
            DevelopmentProcess = "Updated sync logic",
            CurrentStatus = "Delivered",
            MovedToTesting = true,
            TestingCompleted = true,
            Version = "v2.4.1",
            CreatedBy = admin.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.ProductDeploymentHistories.Add(deployment);

        context.ProductDeploymentActivities.Add(new ProductDeploymentActivity
        {
            DeploymentId = deployment.Id,
            ActionType = "Created",
            NewStatus = "New",
            ChangedBy = admin.Id,
            ChangedAt = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var service = new ProductDeploymentService(context, userManager);

        // Act
        var bytes = await service.ExportToExcelAsync(user.Id, new ProductDeploymentFilter());

        // Assert
        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);

        using var stream = new MemoryStream(bytes);
        using var workbook = new ClosedXML.Excel.XLWorkbook(stream);

        Assert.Equal(2, workbook.Worksheets.Count);
        Assert.Equal("Deployment History", workbook.Worksheet(1).Name);
        Assert.Equal("Activity History", workbook.Worksheet(2).Name);

        // Verify sheet 1 headers
        Assert.Equal("Product", workbook.Worksheet(1).Cell(1, 1).GetString());
        Assert.Equal("Issue Date", workbook.Worksheet(1).Cell(1, 4).GetString());
        Assert.Equal("Raised By", workbook.Worksheet(1).Cell(1, 5).GetString());
        Assert.Equal("Mode of Contact", workbook.Worksheet(1).Cell(1, 6).GetString());
        Assert.Equal("Contacted Person", workbook.Worksheet(1).Cell(1, 7).GetString());
        Assert.Equal("Description", workbook.Worksheet(1).Cell(1, 8).GetString());
        Assert.Equal("Last Modified Date & Time", workbook.Worksheet(1).Cell(1, 23).GetString());

        // Verify sheet 2 headers
        Assert.Equal("Deployment ID", workbook.Worksheet(2).Cell(1, 1).GetString());
        Assert.Equal("Changed Date & Time", workbook.Worksheet(2).Cell(1, 10).GetString());
    }

    [Fact]
    public async Task CreateDeployment_WhenRaisedByClient_RequiresModeOfContactAndContactedPerson()
    {
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        await roleManager.CreateAsync(new ApplicationRole { Name = "Employee", IsActive = true });

        var emp = new Employee { Id = 1, Name = "Dev", Email = "dev@test.com", EmployeeCode = "EMP-001", IsActive = true };
        context.Employees.Add(emp);

        var user = new ApplicationUser { Id = 101, UserName = emp.Email, Email = emp.Email, EmployeeId = emp.Id, IsActive = true };
        await userManager.CreateAsync(user, "Pass@123");
        await userManager.AddToRoleAsync(user, "Employee");

        var prod = new Product { Id = 1, Name = "OLMS", Code = "OLMS", IsActive = true };
        var client = new Client { Id = 1, CompanyName = "Client A", CustomerName = "Rep A", IsActive = true };
        context.Products.Add(prod);
        context.Clients.Add(client);
        context.ProductClientMappings.Add(new ProductClientMapping { ProductId = prod.Id, ClientId = client.Id, IsActive = true });
        context.EmployeeProductAccesses.Add(new EmployeeProductAccess { EmployeeId = emp.Id, ProductId = prod.Id, IsActive = true });
        await context.SaveChangesAsync();

        var service = new ProductDeploymentService(context, userManager);

        // Case 1: Missing Mode of Contact
        var req1 = new CreateProductDeploymentRequest
        {
            ProductId = prod.Id,
            ClientId = client.Id,
            Issue = "TEST-01",
            IssueDate = DateTime.UtcNow,
            RaisedBy = "Client",
            ModeOfContact = null,
            ContactedPerson = "John Client",
            Description = "Desc"
        };
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateDeploymentAsync(user.Id, req1));

        // Case 2: Missing Contacted Person
        var req2 = new CreateProductDeploymentRequest
        {
            ProductId = prod.Id,
            ClientId = client.Id,
            Issue = "TEST-01",
            IssueDate = DateTime.UtcNow,
            RaisedBy = "Client",
            ModeOfContact = "Email",
            ContactedPerson = "",
            Description = "Desc"
        };
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateDeploymentAsync(user.Id, req2));

        // Case 3: Valid Client report
        var req3 = new CreateProductDeploymentRequest
        {
            ProductId = prod.Id,
            ClientId = client.Id,
            Issue = "TEST-01",
            IssueDate = DateTime.UtcNow,
            RaisedBy = "Client",
            ModeOfContact = "Email",
            ContactedPerson = "John Client",
            Description = "Desc"
        };
        var created = await service.CreateDeploymentAsync(user.Id, req3);
        Assert.Equal("Client", created.RaisedBy);
        Assert.Equal("Email", created.ModeOfContact);
        Assert.Equal("John Client", created.ContactedPerson);
    }

    [Fact]
    public async Task CreateDeployment_WhenRaisedByInternallyFound_ClearsContactFields()
    {
        using var context = CreateInMemoryDbContext();
        var (userManager, roleManager) = CreateIdentityManagers(context);

        await roleManager.CreateAsync(new ApplicationRole { Name = "Employee", IsActive = true });

        var emp = new Employee { Id = 1, Name = "Dev", Email = "dev@test.com", EmployeeCode = "EMP-001", IsActive = true };
        context.Employees.Add(emp);

        var user = new ApplicationUser { Id = 101, UserName = emp.Email, Email = emp.Email, EmployeeId = emp.Id, IsActive = true };
        await userManager.CreateAsync(user, "Pass@123");
        await userManager.AddToRoleAsync(user, "Employee");

        var prod = new Product { Id = 1, Name = "OLMS", Code = "OLMS", IsActive = true };
        var client = new Client { Id = 1, CompanyName = "Client A", CustomerName = "Rep A", IsActive = true };
        context.Products.Add(prod);
        context.Clients.Add(client);
        context.ProductClientMappings.Add(new ProductClientMapping { ProductId = prod.Id, ClientId = client.Id, IsActive = true });
        context.EmployeeProductAccesses.Add(new EmployeeProductAccess { EmployeeId = emp.Id, ProductId = prod.Id, IsActive = true });
        await context.SaveChangesAsync();

        var service = new ProductDeploymentService(context, userManager);

        var req = new CreateProductDeploymentRequest
        {
            ProductId = prod.Id,
            ClientId = client.Id,
            Issue = "TEST-02",
            IssueDate = DateTime.UtcNow,
            RaisedBy = "Internally Found",
            ModeOfContact = "Email", // Stale client contact data passed
            ContactedPerson = "Should Be Cleared",
            Description = "Internal bug found during QA"
        };

        var created = await service.CreateDeploymentAsync(user.Id, req);

        Assert.Equal("Internally Found", created.RaisedBy);
        Assert.Null(created.ModeOfContact);
        Assert.Null(created.ContactedPerson);
    }
}
