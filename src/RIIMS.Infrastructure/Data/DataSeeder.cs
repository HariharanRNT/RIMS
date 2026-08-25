using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(RiimsDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole<int>> roleManager)
    {
        // Ensure Database Created / Migrated
        try
        {
            await context.Database.MigrateAsync();
        }
        catch
        {
            await context.Database.EnsureCreatedAsync();
        }

        // Ensure EmployeeSessions table exists
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                IF OBJECT_ID(N'[dbo].[EmployeeSessions]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[EmployeeSessions] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [EmployeeId] INT NOT NULL,
                        [SessionId] UNIQUEIDENTIFIER NOT NULL,
                        [TokenJti] NVARCHAR(128) NOT NULL,
                        [WorkDate] DATE NOT NULL,
                        [LoginTime] DATETIME2 NOT NULL,
                        [LastSeenAt] DATETIME2 NOT NULL,
                        [ExpiresAt] DATETIME2 NOT NULL,
                        [LogoutTime] DATETIME2 NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [DeviceInfo] NVARCHAR(512) NULL,
                        [CreatedBy] INT NULL,
                        [CreatedAt] DATETIME2 NOT NULL,
                        [UpdatedAt] DATETIME2 NOT NULL,
                        CONSTRAINT [FK_EmployeeSessions_Employees] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees]([Id]) ON DELETE CASCADE
                    );

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmployeeSessions_SessionId')
                        CREATE UNIQUE INDEX [IX_EmployeeSessions_SessionId] ON [dbo].[EmployeeSessions] ([SessionId]);

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmployeeSessions_EmployeeId_IsActive_WorkDate')
                        CREATE INDEX [IX_EmployeeSessions_EmployeeId_IsActive_WorkDate] ON [dbo].[EmployeeSessions] ([EmployeeId], [IsActive], [WorkDate]);

                    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_EmployeeSessions_TokenJti')
                        CREATE INDEX [IX_EmployeeSessions_TokenJti] ON [dbo].[EmployeeSessions] ([TokenJti]);
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeSessions]') AND name = 'CreatedBy')
                    BEGIN
                        ALTER TABLE [dbo].[EmployeeSessions] ADD [CreatedBy] INT NULL;
                    END
                END;
            ");
        }
        catch
        {
            // Table already exists or migration handled
        }

        // 1. Roles
        string[] roles = { "Admin", "Employee" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new IdentityRole<int>(role));
            }
        }

        // 2. Department & Designation for Admin
        var adminDept = await context.Departments.FirstOrDefaultAsync(d => d.Name == "Administration");
        if (adminDept == null)
        {
            adminDept = new Department { Name = "Administration" };
            context.Departments.Add(adminDept);
            await context.SaveChangesAsync();
        }

        var adminDesig = await context.Designations.FirstOrDefaultAsync(d => d.Name == "System Administrator");
        if (adminDesig == null)
        {
            adminDesig = new Designation { Name = "System Administrator" };
            context.Designations.Add(adminDesig);
            await context.SaveChangesAsync();
        }

        // Reactivate any departments or designations that have active employees
        var deptsToReactivate = await context.Departments
            .IgnoreQueryFilters()
            .Where(d => !d.IsActive && context.Employees.IgnoreQueryFilters().Any(e => e.DepartmentId == d.Id && e.IsActive))
            .ToListAsync();
        foreach (var d in deptsToReactivate)
        {
            d.IsActive = true;
        }

        var desigsToReactivate = await context.Designations
            .IgnoreQueryFilters()
            .Where(d => !d.IsActive && context.Employees.IgnoreQueryFilters().Any(e => e.DesignationId == d.Id && e.IsActive))
            .ToListAsync();
        foreach (var d in desigsToReactivate)
        {
            d.IsActive = true;
        }
        await context.SaveChangesAsync();

        // 3. Admin Employee & Identity User
        var adminEmail = "admin@riims.local";
        var adminEmp = await context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Email == adminEmail || e.EmployeeCode == "EMP-001");

        if (adminEmp == null)
        {
            adminEmp = new Employee
            {
                EmployeeCode = "EMP-001",
                Name = "System Admin",
                Email = adminEmail,
                DepartmentId = adminDept.Id,
                DesignationId = adminDesig.Id,
                DateOfJoining = DateTime.UtcNow.Date
            };
            context.Employees.Add(adminEmp);
            await context.SaveChangesAsync();
        }

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmployeeId = adminEmp.Id,
                MustChangePassword = false
            };

            var result = await userManager.CreateAsync(adminUser, "Admin@123456");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }

        // 3b. Admin Employee & Identity User (harideepa0611@gmail.com)
        var admin2Email = "harideepa0611@gmail.com";
        var admin2Emp = await context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Email == admin2Email || e.EmployeeCode == "EMP-002");

        if (admin2Emp == null)
        {
            admin2Emp = new Employee
            {
                EmployeeCode = "EMP-002",
                Name = "Hari Deepa",
                Email = admin2Email,
                DepartmentId = adminDept.Id,
                DesignationId = adminDesig.Id,
                DateOfJoining = DateTime.UtcNow.Date
            };
            context.Employees.Add(admin2Emp);
            await context.SaveChangesAsync();
        }

        var admin2User = await userManager.FindByEmailAsync(admin2Email);
        if (admin2User == null)
        {
            admin2User = new ApplicationUser
            {
                UserName = admin2Email,
                Email = admin2Email,
                EmployeeId = admin2Emp.Id,
                MustChangePassword = false
            };

            var result = await userManager.CreateAsync(admin2User, "Admin@123");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin2User, "Admin");
            }
        }

        // 4. System Settings
        var defaultSettings = new (string Key, string Value, string Description)[]
        {
            ("OfficeStartTime", "10:00 AM", "Official employee login start time"),
            ("OfficeEndTime", "07:00 PM", "Official office closing time"),
            ("GraceMinutes", "15", "Allowed grace period minutes after office start"),
            ("PermissionHours", "1", "Late login permission allocation hours per month"),
            ("MonthlyAllowedPermissions", "1", "Number of permission requests allowed per employee per month before excess late logins apply"),
            ("LateLoginsForHalfDay", "2", "Number of unpermissioned late logins required for half-day LOP"),
            ("MonthlyAllowedLeave", "1", "Number of leave days allowed for each employee per month before LOP is applied."),

            // Employee Celebration Settings
            ("BirthdayWishesEnabled", "true", "Enable automatic Birthday wishes"),
            ("BirthdayWishesChannel", "Both", "Delivery channel for Birthday wishes: RIIMS, Email, or Both"),
            ("BirthdayWishesNotifyAllEmployees", "true", "Broadcast Birthday wishes to all active employees"),

            ("CompanyAnniversaryWishesEnabled", "true", "Enable automatic Company Anniversary wishes"),
            ("CompanyAnniversaryWishesChannel", "Both", "Delivery channel for Company Anniversary wishes: RIIMS, Email, or Both"),
            ("CompanyAnniversaryWishesNotifyAllEmployees", "true", "Broadcast Company Anniversary wishes to all active employees"),

            ("MarriageAnniversaryWishesEnabled", "true", "Enable automatic Marriage Anniversary wishes"),
            ("MarriageAnniversaryWishesChannel", "Both", "Delivery channel for Marriage Anniversary wishes: RIIMS, Email, or Both"),
            ("MarriageAnniversaryWishesNotifyAllEmployees", "false", "Broadcast Marriage Anniversary wishes to all active employees")
        };

        foreach (var setting in defaultSettings)
        {
            if (!await context.SystemSettings.AnyAsync(s => s.Key == setting.Key))
            {
                context.SystemSettings.Add(new SystemSetting
                {
                    Key = setting.Key,
                    Value = setting.Value,
                    Description = setting.Description
                });
            }
        }

        // 5. Break Types
        var defaultBreakTypes = new (string Name, int AllowedMinutes)[]
        {
            ("Bio Break", 5),
            ("Tea Break", 10),
            ("Lunch Break", 60),
            ("Call Break", 10),
            ("Other", 15)
        };

        foreach (var b in defaultBreakTypes)
        {
            var existing = await context.BreakTypes.FirstOrDefaultAsync(x => x.Name == b.Name);
            if (existing == null)
            {
                context.BreakTypes.Add(new BreakType { Name = b.Name, AllowedMinutes = b.AllowedMinutes });
            }
            else if (existing.AllowedMinutes <= 0)
            {
                existing.AllowedMinutes = b.AllowedMinutes;
            }
        }

        // Ensure any other break types have a valid positive AllowedMinutes
        var unconfiguredBreaks = await context.BreakTypes.Where(x => x.AllowedMinutes <= 0).ToListAsync();
        foreach (var ub in unconfiguredBreaks)
        {
            ub.AllowedMinutes = 15;
        }

        // 6. Support Activity Types
        string[] supportTypes = { "Support Call", "Call", "Meeting", "Discussion", "Demo" };
        foreach (var s in supportTypes)
        {
            if (!await context.SupportActivityTypes.AnyAsync(x => x.Name == s))
            {
                context.SupportActivityTypes.Add(new SupportActivityType { Name = s });
            }
        }

        // 7. Leave Types
        string[] leaveTypes = { "Casual Leave", "Sick Leave", "Earned Leave" };
        foreach (var l in leaveTypes)
        {
            if (!await context.LeaveTypes.AnyAsync(x => x.Name == l))
            {
                context.LeaveTypes.Add(new LeaveType { Name = l });
            }
        }

        await context.SaveChangesAsync();

        // 8. Seed Dummy Data for last month & current month analysis
        await DummyDataSeeder.SeedDummyDataAsync(context, userManager, roleManager);
    }
}

