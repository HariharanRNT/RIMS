using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Identity;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Data;

public static class DummyDataSeeder
{
    public static async Task SeedDummyDataAsync(RiimsDbContext context, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager)
    {
        // Auto-fix reporting relationships so EMP-002 (John Doe) has reportees for manager testing
        var johnDoeEmp = await context.Employees.FirstOrDefaultAsync(e => e.EmployeeCode == "EMP-002");
        if (johnDoeEmp != null)
        {
            var reporteesToUpdate = await context.Employees
                .Where(e => (e.EmployeeCode == "EMP-003" || e.EmployeeCode == "EMP-004") && e.ReportingPersonId != johnDoeEmp.Id)
                .ToListAsync();

            if (reporteesToUpdate.Any())
            {
                foreach (var r in reporteesToUpdate)
                {
                    r.ReportingPersonId = johnDoeEmp.Id;
                }
                await context.SaveChangesAsync();
            }
        }

        // 1. Check if dummy employees already exist to ensure idempotency
        var existingDummyEmp = await context.Employees.FirstOrDefaultAsync(e => e.EmployeeCode == "EMP-002");
        if (existingDummyEmp != null)
        {
            return; // Dummy data already seeded!
        }

        // 2. Ensure Departments
        var departments = new Dictionary<string, Department>();
        string[] deptNames = { "Administration", "Software Engineering", "Quality Assurance", "Product Support", "Human Resources", "Finance" };
        foreach (var name in deptNames)
        {
            var dept = await context.Departments.FirstOrDefaultAsync(d => d.Name == name);
            if (dept == null)
            {
                dept = new Department { Name = name };
                context.Departments.Add(dept);
                await context.SaveChangesAsync();
            }
            departments[name] = dept;
        }

        // 3. Ensure Designations
        var designations = new Dictionary<string, Designation>();
        string[] desigNames = { "System Administrator", "Senior Software Engineer", "Full Stack Developer", "QA Lead", "Product Support Specialist", "HR Specialist", "Financial Analyst" };
        foreach (var name in desigNames)
        {
            var desig = await context.Designations.FirstOrDefaultAsync(d => d.Name == name);
            if (desig == null)
            {
                desig = new Designation { Name = name };
                context.Designations.Add(desig);
                await context.SaveChangesAsync();
            }
            designations[name] = desig;
        }

        // 4. Products
        var products = new List<Product>();
        if (!await context.Products.AnyAsync())
        {
            products = new List<Product>
            {
                new Product { Code = "PRD-001", Name = "RIIMS Enterprise Portal" },
                new Product { Code = "PRD-002", Name = "HealthTech Suite" },
                new Product { Code = "PRD-003", Name = "FinTrack ERP" },
                new Product { Code = "PRD-004", Name = "EduConnect LMS" }
            };
            context.Products.AddRange(products);
            await context.SaveChangesAsync();
        }
        else
        {
            products = await context.Products.ToListAsync();
        }

        // 5. Clients
        var clients = new List<Client>();
        if (!await context.Clients.AnyAsync())
        {
            clients = new List<Client>
            {
                new Client { CompanyName = "Apex Innovations Pvt Ltd", CustomerName = "Rajesh Verma", City = "Bangalore", State = "Karnataka", Country = "India", GSTNo = "29AAAAA0000A1Z5" },
                new Client { CompanyName = "Global Logistics Corp", CustomerName = "Priya Menon", City = "Mumbai", State = "Maharashtra", Country = "India", GSTNo = "27BBBBB0000B1Z6" },
                new Client { CompanyName = "Quantum Health Systems", CustomerName = "Dr. Anil Kapoor", City = "Chennai", State = "Tamil Nadu", Country = "India", GSTNo = "33CCCCC0000C1Z7" },
                new Client { CompanyName = "Horizon Financial Services", CustomerName = "Meera Nambiar", City = "Hyderabad", State = "Telangana", Country = "India", GSTNo = "36DDDDD0000D1Z8" },
                new Client { CompanyName = "Zenith Education Trust", CustomerName = "Suresh Raina", City = "New Delhi", State = "Delhi", Country = "India", GSTNo = "07EEEEE0000E1Z9" }
            };
            context.Clients.AddRange(clients);
            await context.SaveChangesAsync();
        }
        else
        {
            clients = await context.Clients.ToListAsync();
        }

        // 6. Product-Client Mappings
        if (!await context.ProductClientMappings.AnyAsync())
        {
            var mappings = new List<ProductClientMapping>
            {
                new ProductClientMapping { ProductId = products[0].Id, ClientId = clients[0].Id },
                new ProductClientMapping { ProductId = products[0].Id, ClientId = clients[1].Id },
                new ProductClientMapping { ProductId = products[1].Id, ClientId = clients[2].Id },
                new ProductClientMapping { ProductId = products[2].Id, ClientId = clients[3].Id },
                new ProductClientMapping { ProductId = products[3].Id, ClientId = clients[4].Id }
            };
            context.ProductClientMappings.AddRange(mappings);
            await context.SaveChangesAsync();
        }

        // 7. Get or Create Admin Employee (EMP-001)
        var adminEmp = await context.Employees.FirstOrDefaultAsync(e => e.EmployeeCode == "EMP-001");
        if (adminEmp == null)
        {
            adminEmp = new Employee
            {
                EmployeeCode = "EMP-001",
                Name = "System Admin",
                Email = "admin@riims.local",
                DepartmentId = departments["Administration"].Id,
                DesignationId = designations["System Administrator"].Id,
                DateOfJoining = DateTime.UtcNow.AddYears(-2).Date
            };
            context.Employees.Add(adminEmp);
            await context.SaveChangesAsync();
        }

        // 8. Seed Sample Employees
        var sampleEmpSpecs = new[]
        {
            new { Code = "EMP-002", Name = "John Doe", Email = "john.doe@riims.local", Dept = "Software Engineering", Desig = "Senior Software Engineer", ShiftStart = new TimeSpan(9, 0, 0), ShiftEnd = new TimeSpan(18, 0, 0), Loc = WorkLocation.Office, Phone = "9876543210", Basic = 55000m },
            new { Code = "EMP-003", Name = "Sarah Smith", Email = "sarah.smith@riims.local", Dept = "Software Engineering", Desig = "Full Stack Developer", ShiftStart = new TimeSpan(9, 0, 0), ShiftEnd = new TimeSpan(18, 0, 0), Loc = WorkLocation.Remote, Phone = "9876543211", Basic = 45000m },
            new { Code = "EMP-004", Name = "Alex Johnson", Email = "alex.johnson@riims.local", Dept = "Quality Assurance", Desig = "QA Lead", ShiftStart = new TimeSpan(9, 30, 0), ShiftEnd = new TimeSpan(18, 30, 0), Loc = WorkLocation.Hybrid, Phone = "9876543212", Basic = 48000m },
            new { Code = "EMP-005", Name = "Priya Sharma", Email = "priya.sharma@riims.local", Dept = "Product Support", Desig = "Product Support Specialist", ShiftStart = new TimeSpan(9, 0, 0), ShiftEnd = new TimeSpan(18, 0, 0), Loc = WorkLocation.Office, Phone = "9876543213", Basic = 38000m },
            new { Code = "EMP-006", Name = "Robert Chen", Email = "robert.chen@riims.local", Dept = "Human Resources", Desig = "HR Specialist", ShiftStart = new TimeSpan(9, 0, 0), ShiftEnd = new TimeSpan(18, 0, 0), Loc = WorkLocation.Office, Phone = "9876543214", Basic = 42000m }
        };

        var createdEmployees = new List<Employee> { adminEmp };

        foreach (var spec in sampleEmpSpecs)
        {
            var emp = new Employee
            {
                EmployeeCode = spec.Code,
                Name = spec.Name,
                Email = spec.Email,
                Phone = spec.Phone,
                DepartmentId = departments[spec.Dept].Id,
                DesignationId = designations[spec.Desig].Id,
                ReportingPersonId = adminEmp.Id,
                DateOfJoining = DateTime.UtcNow.AddMonths(-10).Date
            };
            context.Employees.Add(emp);
            await context.SaveChangesAsync();

            // Work Detail
            context.EmployeeWorkDetails.Add(new EmployeeWorkDetail
            {
                EmployeeId = emp.Id,
                ShiftStart = spec.ShiftStart,
                ShiftEnd = spec.ShiftEnd,
                WorkLocation = spec.Loc,
                EmploymentType = EmploymentType.FullTime
            });

            // Identity User
            var user = await userManager.FindByEmailAsync(spec.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = spec.Email,
                    Email = spec.Email,
                    EmployeeId = emp.Id,
                    MustChangePassword = false
                };
                var res = await userManager.CreateAsync(user, "Emp@123456");
                if (res.Succeeded)
                {
                    await userManager.AddToRoleAsync(user, "Employee");
                }
            }

            createdEmployees.Add(emp);
        }
        await context.SaveChangesAsync();
    }
}

