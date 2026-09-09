using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(RiimsDbContext context, UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager)
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

        // Ensure auxiliary tables (EmployeeSessions, PasswordResetTokens, AdminNotificationReads) exist
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
                        [AllowedEndTime] DATETIME2 NULL,
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
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeSessions]') AND name = 'AllowedEndTime')
                    BEGIN
                        ALTER TABLE [dbo].[EmployeeSessions] ADD [AllowedEndTime] DATETIME2 NULL;
                    END
                END;

                IF OBJECT_ID(N'[dbo].[PasswordResetTokens]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[PasswordResetTokens] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [UserId] INT NOT NULL,
                        [TokenHash] NVARCHAR(450) NOT NULL,
                        [ExpiresAt] DATETIME2 NOT NULL,
                        [IsUsed] BIT NOT NULL DEFAULT 0,
                        [UsedAt] DATETIME2 NULL,
                        [CreatedByIp] NVARCHAR(MAX) NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [CreatedAt] DATETIME2 NOT NULL,
                        [UpdatedAt] DATETIME2 NOT NULL,
                        [CreatedBy] INT NULL
                    );

                    CREATE INDEX [IX_PasswordResetTokens_UserId_IsUsed] ON [dbo].[PasswordResetTokens] ([UserId], [IsUsed]);
                    CREATE INDEX [IX_PasswordResetTokens_TokenHash_IsUsed_ExpiresAt] ON [dbo].[PasswordResetTokens] ([TokenHash], [IsUsed], [ExpiresAt]);
                END;

                IF OBJECT_ID(N'[dbo].[AdminNotificationReads]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[AdminNotificationReads] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [NotificationKey] NVARCHAR(450) NOT NULL,
                        [ReadAt] DATETIME2 NOT NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [CreatedAt] DATETIME2 NOT NULL,
                        [UpdatedAt] DATETIME2 NOT NULL,
                        [CreatedBy] INT NULL
                    );

                    CREATE UNIQUE INDEX [IX_AdminNotificationReads_NotificationKey] ON [dbo].[AdminNotificationReads] ([NotificationKey]);
                END;

                IF OBJECT_ID(N'[dbo].[EmployeeProductAccesses]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[EmployeeProductAccesses] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [EmployeeId] INT NOT NULL,
                        [ProductId] INT NOT NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [CreatedAt] DATETIME2 NOT NULL,
                        [UpdatedAt] DATETIME2 NOT NULL,
                        [CreatedBy] INT NULL,
                        CONSTRAINT [FK_EmployeeProductAccesses_Employees] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees]([Id]) ON DELETE CASCADE,
                        CONSTRAINT [FK_EmployeeProductAccesses_Products] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products]([Id]) ON DELETE CASCADE
                    );
                    CREATE INDEX [IX_EmployeeProductAccesses_EmployeeId_ProductId_IsActive] ON [dbo].[EmployeeProductAccesses] ([EmployeeId], [ProductId], [IsActive]);
                END;

                IF OBJECT_ID(N'[dbo].[ProductDeploymentHistories]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[ProductDeploymentHistories] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [ProductId] INT NOT NULL,
                        [ClientId] INT NOT NULL,
                        [Issue] NVARCHAR(200) NOT NULL,
                        [IssueDate] DATETIME2 NOT NULL,
                        [RaisedBy] NVARCHAR(100) NOT NULL DEFAULT 'Client',
                        [ModeOfContact] NVARCHAR(100) NULL,
                        [ContactedPerson] NVARCHAR(200) NULL,
                        [Description] NVARCHAR(MAX) NOT NULL,
                        [DevelopmentProcess] NVARCHAR(MAX) NOT NULL,
                        [CurrentStatus] NVARCHAR(100) NOT NULL DEFAULT 'New',
                        [MovedToTesting] BIT NOT NULL DEFAULT 0,
                        [MovedToTestingBy] INT NULL,
                        [MovedToTestingAt] DATETIME2 NULL,
                        [TestingCompleted] BIT NOT NULL DEFAULT 0,
                        [TestingCompletedBy] INT NULL,
                        [TestingCompletedAt] DATETIME2 NULL,
                        [DeliveryDate] DATETIME2 NULL,
                        [DeliveredBy] INT NULL,
                        [DeliveredAt] DATETIME2 NULL,
                        [Version] NVARCHAR(100) NULL,
                        [ModifiedBy] INT NULL,
                        [ModifiedAt] DATETIME2 NULL,
                        [IsActive] BIT NOT NULL DEFAULT 1,
                        [CreatedAt] DATETIME2 NOT NULL,
                        [UpdatedAt] DATETIME2 NOT NULL,
                        [CreatedBy] INT NULL,
                        CONSTRAINT [FK_ProductDeploymentHistories_Products] FOREIGN KEY ([ProductId]) REFERENCES [dbo].[Products]([Id]),
                        CONSTRAINT [FK_ProductDeploymentHistories_Clients] FOREIGN KEY ([ClientId]) REFERENCES [dbo].[Clients]([Id]),
                        CONSTRAINT [FK_ProductDeploymentHistories_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [dbo].[Employees]([Id]),
                        CONSTRAINT [FK_ProductDeploymentHistories_ModifiedBy] FOREIGN KEY ([ModifiedBy]) REFERENCES [dbo].[Employees]([Id]),
                        CONSTRAINT [FK_ProductDeploymentHistories_MovedToTestingBy] FOREIGN KEY ([MovedToTestingBy]) REFERENCES [dbo].[Employees]([Id]),
                        CONSTRAINT [FK_ProductDeploymentHistories_TestingCompletedBy] FOREIGN KEY ([TestingCompletedBy]) REFERENCES [dbo].[Employees]([Id]),
                        CONSTRAINT [FK_ProductDeploymentHistories_DeliveredBy] FOREIGN KEY ([DeliveredBy]) REFERENCES [dbo].[Employees]([Id])
                    );
                    CREATE INDEX [IX_ProductDeploymentHistories_ProductId] ON [dbo].[ProductDeploymentHistories] ([ProductId]);
                    CREATE INDEX [IX_ProductDeploymentHistories_ClientId] ON [dbo].[ProductDeploymentHistories] ([ClientId]);
                    CREATE INDEX [IX_ProductDeploymentHistories_CurrentStatus] ON [dbo].[ProductDeploymentHistories] ([CurrentStatus]);
                    CREATE INDEX [IX_ProductDeploymentHistories_IssueDate] ON [dbo].[ProductDeploymentHistories] ([IssueDate]);
                    CREATE INDEX [IX_ProductDeploymentHistories_DeliveryDate] ON [dbo].[ProductDeploymentHistories] ([DeliveryDate]);
                    CREATE INDEX [IX_ProductDeploymentHistories_CreatedBy] ON [dbo].[ProductDeploymentHistories] ([CreatedBy]);
                END
                ELSE
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductDeploymentHistories]') AND name = 'RaisedBy')
                    BEGIN
                        ALTER TABLE [dbo].[ProductDeploymentHistories] ADD [RaisedBy] NVARCHAR(100) NOT NULL DEFAULT 'Client';
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductDeploymentHistories]') AND name = 'ModeOfContact')
                    BEGIN
                        ALTER TABLE [dbo].[ProductDeploymentHistories] ADD [ModeOfContact] NVARCHAR(100) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[ProductDeploymentHistories]') AND name = 'ContactedPerson')
                    BEGIN
                        ALTER TABLE [dbo].[ProductDeploymentHistories] ADD [ContactedPerson] NVARCHAR(200) NULL;
                    END
                END;

                IF OBJECT_ID(N'[dbo].[ProductDeploymentActivities]') IS NULL
                BEGIN
                    CREATE TABLE [dbo].[ProductDeploymentActivities] (
                        [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [DeploymentId] INT NOT NULL,
                        [ActionType] NVARCHAR(100) NOT NULL,
                        [PreviousStatus] NVARCHAR(100) NULL,
                        [NewStatus] NVARCHAR(100) NULL,
                        [Remarks] NVARCHAR(MAX) NULL,
                        [ChangedBy] INT NOT NULL,
                        [ChangedAt] DATETIME2 NOT NULL,
                        CONSTRAINT [FK_ProductDeploymentActivities_Deployment] FOREIGN KEY ([DeploymentId]) REFERENCES [dbo].[ProductDeploymentHistories]([Id]) ON DELETE CASCADE,
                        CONSTRAINT [FK_ProductDeploymentActivities_ChangedBy] FOREIGN KEY ([ChangedBy]) REFERENCES [dbo].[Employees]([Id])
                    );
                    CREATE INDEX [IX_ProductDeploymentActivities_DeploymentId] ON [dbo].[ProductDeploymentActivities] ([DeploymentId]);
                    CREATE INDEX [IX_ProductDeploymentActivities_ChangedAt] ON [dbo].[ProductDeploymentActivities] ([ChangedAt]);
                END;
            ");
        }
        catch
        {
            // Table already exists or migration handled
        }

        // 1. Seed Permissions Catalog
        var permissionDefinitions = new (string Code, string Name, string Module, string Description)[]
        {
            // Employee Module
            ("Employee.View", "View Employees", "Employee", "View employee list and employee master records"),
            ("Employee.Create", "Create Employee", "Employee", "Create and register new employee profiles"),
            ("Employee.Edit", "Edit Employee", "Employee", "Modify employee profile details and work allocations"),
            ("Employee.Delete", "Delete Employee", "Employee", "Delete employee records"),
            ("Employee.Activate", "Activate Employee", "Employee", "Reactivate deactivated employee profiles"),
            ("Employee.Deactivate", "Deactivate Employee", "Employee", "Deactivate active employee profiles"),

            // Department & Designation
            ("Department.View", "View Departments", "Department", "View department master directory"),
            ("Department.Manage", "Manage Departments", "Department", "Create, edit, and delete departments"),
            ("Designation.View", "View Designations", "Designation", "View designation master directory"),
            ("Designation.Manage", "Manage Designations", "Designation", "Create, edit, and delete designations"),

            // Attendance & Calendar
            ("Attendance.View", "View Attendance", "Attendance", "View real-time and historical attendance records"),
            ("Attendance.Edit", "Edit Attendance", "Attendance", "Modify employee attendance punch logs"),
            ("Attendance.Approve", "Approve Attendance", "Attendance", "Approve attendance records and deviations"),
            ("Attendance.Export", "Export Attendance", "Attendance", "Export attendance logs to Excel/CSV"),
            ("AttendanceCalendar.View", "View Calendar", "AttendanceCalendar", "View monthly work schedule and holidays"),
            ("AttendanceCalendar.Manage", "Manage Calendar", "AttendanceCalendar", "Update working day / holiday / weekend classifications"),
            ("AttendanceCalendar.Publish", "Publish Calendar", "AttendanceCalendar", "Publish monthly attendance calendar to workforce"),

            // Leave & Permission Requests
            ("Leave.View", "View Leaves", "Leave", "View leave requests across employees"),
            ("Leave.Create", "Create Leave", "Leave", "Apply for leave requests"),
            ("Leave.Approve", "Approve Leave", "Leave", "Approve pending employee leave requests"),
            ("Leave.Reject", "Reject Leave", "Leave", "Reject pending employee leave requests"),
            ("Permission.View", "View Permissions", "Permission", "View late login / permission requests"),
            ("Permission.Approve", "Approve Permission", "Permission", "Approve pending employee permission requests"),
            ("Permission.Reject", "Reject Permission", "Permission", "Reject pending employee permission requests"),

            // Task & Support Management
            ("Task.View", "View Tasks", "Task", "View task allocation engine and timeline"),
            ("Task.Create", "Create Task", "Task", "Create and allocate tasks"),
            ("Task.Assign", "Assign Task", "Task", "Reassign tasks among team members"),
            ("Task.Edit", "Edit Task", "Task", "Modify task parameters and deadlines"),
            ("Task.Delete", "Delete Task", "Task", "Delete allocated tasks"),
            ("Break.View", "View Breaks", "Break", "View employee break logs"),
            ("Break.Manage", "Manage Breaks", "Break", "Configure break types and thresholds"),
            ("SupportActivity.View", "View Support Activities", "SupportActivity", "View support activity sessions and logs"),
            ("SupportActivity.Manage", "Manage Support Activities", "SupportActivity", "Configure support activity categories"),

            // Product Deployment History Module
            ("ProductDeployment.View", "View Product Deployments", "ProductDeployment", "View deployment records for authorized products"),
            ("ProductDeployment.Create", "Create Product Deployment", "ProductDeployment", "Create deployment records for assigned products"),
            ("ProductDeployment.Edit", "Edit Product Deployment", "ProductDeployment", "Update deployment records and status for assigned products"),
            ("ProductDeployment.Export", "Export Product Deployments", "ProductDeployment", "Export authorized product deployment records and activity history to Excel"),
            ("ProductDeployment.Manage", "Manage Product Deployment Access", "ProductDeployment", "Configure employee product access and manage all deployments"),

            // Payroll & Salary Structure
            ("Payroll.View", "View Payroll", "Payroll", "View monthly payroll and LOP deductions"),
            ("Payroll.Generate", "Generate Payroll", "Payroll", "Process and calculate monthly payroll calculations"),
            ("Payroll.Edit", "Edit Payroll", "Payroll", "Override and adjust payroll calculations"),
            ("Payroll.Approve", "Approve Payroll", "Payroll", "Finalize and approve payroll batches"),
            ("Payroll.Export", "Export Payroll", "Payroll", "Export payslips and payroll registers"),
            ("SalaryStructure.View", "View Salary Structure", "SalaryStructure", "View employee salary structures"),
            ("SalaryStructure.Manage", "Manage Salary Structure", "SalaryStructure", "Configure employee salary structures"),

            // Reports & Celebrations
            ("Report.View", "View Reports", "Report", "View production, attendance, and analytics reports"),
            ("Report.Export", "Export Reports", "Report", "Export management summary reports"),
            ("Celebration.View", "View Celebrations", "Celebration", "View birthday and anniversary logs"),
            ("Celebration.Manage", "Manage Celebrations", "Celebration", "Configure celebration preferences"),

            // Administration, RBAC & Settings
            ("Settings.View", "View System Settings", "Settings", "View system configuration and rules"),
            ("Settings.Edit", "Edit System Settings", "Settings", "Update system settings and operational parameters"),
            ("User.View", "View Admin Users", "User", "View administrator accounts"),
            ("User.Create", "Create Admin User", "User", "Register new administrator accounts"),
            ("User.Edit", "Edit Admin User", "User", "Modify administrator details and assign roles"),
            ("User.Deactivate", "Deactivate Admin User", "User", "Deactivate administrator accounts"),
            ("User.ResetPassword", "Reset User Password", "User", "Reset administrator account credentials"),
            ("Role.View", "View Roles", "Role", "View defined system and custom roles"),
            ("Role.Create", "Create Role", "Role", "Create custom authorization roles"),
            ("Role.Edit", "Edit Role", "Role", "Modify role attributes and description"),
            ("Role.Assign", "Assign Role Permissions", "Role", "Configure permission matrix for roles"),
            ("SystemPermission.View", "View System Permissions", "SystemPermission", "Inspect application permission dictionary"),
            ("MasterData.View", "View Master Data", "MasterData", "View products, clients, and lookup mappings"),
            ("MasterData.Manage", "Manage Master Data", "MasterData", "Create and edit products, clients, and mappings")
        };

        var permissionDict = new Dictionary<string, Permission>();
        foreach (var def in permissionDefinitions)
        {
            var existingPerm = await context.Permissions.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == def.Code);
            if (existingPerm == null)
            {
                existingPerm = new Permission
                {
                    Code = def.Code,
                    Name = def.Name,
                    Module = def.Module,
                    Description = def.Description,
                    IsActive = true
                };
                context.Permissions.Add(existingPerm);
            }
            else
            {
                existingPerm.Name = def.Name;
                existingPerm.Module = def.Module;
                existingPerm.Description = def.Description;
                existingPerm.IsActive = true;
            }
            permissionDict[def.Code] = existingPerm;
        }
        await context.SaveChangesAsync();

        // 2. Roles Definition & Seeding
        var roleDefinitions = new (string Name, string Description, bool IsSystem, bool IsProtected)[]
        {
            ("Super Admin", "Super Administrator with unrestricted access to all modules and configurations", true, true),
            ("HR Admin", "HR Administrator - Manages employees, leaves, approvals, and celebrations", true, false),
            ("Attendance Admin", "Attendance Administrator - Manages attendance logs, shifts, and calendar", true, false),
            ("Payroll Admin", "Payroll Administrator - Manages salary structures, LOP, and monthly payroll", true, false),
            ("Task Admin", "Task Administrator - Manages task allocations and support activity logs", true, false),
            ("Reports Admin", "Reports Administrator - Views and exports organizational and financial reports", true, false),
            ("Employee Admin", "Employee Directory Administrator - Manages workforce master data", true, false),
            ("Employee", "Standard Employee Access", true, true),
            ("Admin", "Legacy Full Administrator", false, false)
        };

        var roleEntityDict = new Dictionary<string, ApplicationRole>();
        foreach (var rDef in roleDefinitions)
        {
            var role = await roleManager.FindByNameAsync(rDef.Name);
            if (role == null)
            {
                role = new ApplicationRole
                {
                    Name = rDef.Name,
                    Description = rDef.Description,
                    IsSystemRole = rDef.IsSystem,
                    IsProtected = rDef.IsProtected,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await roleManager.CreateAsync(role);
            }
            else
            {
                role.Description = rDef.Description;
                role.IsSystemRole = rDef.IsSystem;
                role.IsProtected = rDef.IsProtected;
                role.IsActive = true;
                await roleManager.UpdateAsync(role);
            }
            roleEntityDict[rDef.Name] = role;
        }

        // 3. Seed Role-Permissions Map
        var rolePermissionsMap = new Dictionary<string, string[]>
        {
            ["HR Admin"] = new[]
            {
                "Employee.View", "Employee.Create", "Employee.Edit",
                "Leave.View", "Leave.Approve", "Leave.Reject",
                "Permission.View", "Permission.Approve", "Permission.Reject",
                "Attendance.View", "AttendanceCalendar.View",
                "Celebration.View", "Celebration.Manage",
                "Report.View", "Department.View", "Designation.View"
            },
            ["Attendance Admin"] = new[]
            {
                "Attendance.View", "Attendance.Edit", "Attendance.Approve", "Attendance.Export",
                "AttendanceCalendar.View", "AttendanceCalendar.Manage", "AttendanceCalendar.Publish",
                "Break.View", "Break.Manage",
                "Report.View"
            },
            ["Payroll Admin"] = new[]
            {
                "Payroll.View", "Payroll.Generate", "Payroll.Edit", "Payroll.Approve", "Payroll.Export",
                "SalaryStructure.View", "SalaryStructure.Manage",
                "Attendance.View", "Leave.View",
                "Report.View", "Report.Export"
            },
            ["Task Admin"] = new[]
            {
                "Task.View", "Task.Create", "Task.Assign", "Task.Edit", "Task.Delete",
                "SupportActivity.View", "SupportActivity.Manage",
                "Break.View", "Report.View"
            },
            ["Reports Admin"] = new[]
            {
                "Report.View", "Report.Export",
                "Attendance.Export", "Payroll.Export",
                "Employee.View", "Attendance.View", "Leave.View", "Payroll.View", "Task.View"
            },
            ["Employee Admin"] = new[]
            {
                "Employee.View", "Employee.Create", "Employee.Edit", "Employee.Activate", "Employee.Deactivate",
                "Department.View", "Department.Manage",
                "Designation.View", "Designation.Manage",
                "MasterData.View", "MasterData.Manage",
                "ProductDeployment.View", "ProductDeployment.Manage"
            },
            ["Employee"] = new[]
            {
                "Leave.Create", "AttendanceCalendar.View",
                "ProductDeployment.View", "ProductDeployment.Create", "ProductDeployment.Edit", "ProductDeployment.Export"
            },
            ["Admin"] = permissionDefinitions.Select(p => p.Code).ToArray()
        };

        foreach (var (roleName, permCodes) in rolePermissionsMap)
        {
            if (!roleEntityDict.TryGetValue(roleName, out var role)) continue;

            var existingRolePerms = await context.RolePermissions
                .Where(rp => rp.RoleId == role.Id)
                .ToListAsync();

            var targetPermIds = permCodes
                .Where(c => permissionDict.ContainsKey(c))
                .Select(c => permissionDict[c].Id)
                .ToHashSet();

            // Synchronize system roles: remove obsolete permissions that are no longer assigned
            if (role.IsSystemRole)
            {
                var permsToRemove = existingRolePerms.Where(rp => !targetPermIds.Contains(rp.PermissionId)).ToList();
                if (permsToRemove.Any())
                {
                    context.RolePermissions.RemoveRange(permsToRemove);
                }
            }

            var existingPermIds = existingRolePerms.Select(rp => rp.PermissionId).ToHashSet();

            foreach (var code in permCodes)
            {
                if (permissionDict.TryGetValue(code, out var perm))
                {
                    if (!existingPermIds.Contains(perm.Id))
                    {
                        context.RolePermissions.Add(new RolePermission
                        {
                            RoleId = role.Id,
                            PermissionId = perm.Id
                        });
                    }
                }
            }
        }
        await context.SaveChangesAsync();

        // 4. Department & Designation for Admin
        var adminDept = await context.Departments.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Name == "Administration");
        if (adminDept == null)
        {
            adminDept = new Department { Name = "Administration", IsActive = true };
            context.Departments.Add(adminDept);
            await context.SaveChangesAsync();
        }
        else if (!adminDept.IsActive)
        {
            adminDept.IsActive = true;
            await context.SaveChangesAsync();
        }

        var adminDesig = await context.Designations.IgnoreQueryFilters().FirstOrDefaultAsync(d => d.Name == "System Administrator");
        if (adminDesig == null)
        {
            adminDesig = new Designation { Name = "System Administrator", IsActive = true };
            context.Designations.Add(adminDesig);
            await context.SaveChangesAsync();
        }
        else if (!adminDesig.IsActive)
        {
            adminDesig.IsActive = true;
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

        // 5. Admin Employee & Identity User (anitha@reshandthosh.com) -> Super Admin
        var adminEmail = "anitha@reshandthosh.com";

        // Migrate old dummy user if exists
        var oldAdminUser = await userManager.FindByEmailAsync("admin@riims.local");
        var existingAdminUser = await userManager.FindByEmailAsync(adminEmail);
        if (oldAdminUser != null)
        {
            if (existingAdminUser != null && existingAdminUser.Id != oldAdminUser.Id)
            {
                await userManager.DeleteAsync(oldAdminUser);
            }
            else if (existingAdminUser == null)
            {
                oldAdminUser.Email = adminEmail;
                oldAdminUser.UserName = adminEmail;
                oldAdminUser.NormalizedEmail = adminEmail.ToUpperInvariant();
                oldAdminUser.NormalizedUserName = adminEmail.ToUpperInvariant();
                await userManager.UpdateAsync(oldAdminUser);
            }
        }

        var oldAdminEmp = await context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Email == "admin@riims.local");
        if (oldAdminEmp != null)
        {
            var existingAdminEmp = await context.Employees
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(e => e.Email == adminEmail);
            if (existingAdminEmp != null && existingAdminEmp.Id != oldAdminEmp.Id)
            {
                oldAdminEmp.IsActive = false;
                await context.SaveChangesAsync();
            }
            else if (existingAdminEmp == null)
            {
                oldAdminEmp.Email = adminEmail;
                await context.SaveChangesAsync();
            }
        }

        var adminEmp = await context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Email == adminEmail || e.EmployeeCode == "EMP-001");

        if (adminEmp == null)
        {
            adminEmp = new Employee
            {
                EmployeeCode = "EMP-001",
                Name = "Anitha (Admin)",
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
                MustChangePassword = false,
                IsActive = true
            };

            var result = await userManager.CreateAsync(adminUser, "Admin@123456");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Super Admin");
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }
        else
        {
            if (!await userManager.IsInRoleAsync(adminUser, "Super Admin"))
            {
                await userManager.AddToRoleAsync(adminUser, "Super Admin");
            }
            if (!await userManager.IsInRoleAsync(adminUser, "Admin"))
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }

        // 5b. Admin Employee & Identity User (harideepa0611@gmail.com) -> Super Admin
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
                MustChangePassword = false,
                IsActive = true
            };

            var result = await userManager.CreateAsync(admin2User, "Admin@123");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(admin2User, "Super Admin");
                await userManager.AddToRoleAsync(admin2User, "Admin");
            }
        }
        else
        {
            if (!await userManager.IsInRoleAsync(admin2User, "Super Admin"))
            {
                await userManager.AddToRoleAsync(admin2User, "Super Admin");
            }
        }

        // 5c. Automatically migrate all existing users and ensure IsActive = true and EmployeeId is valid
        var allUsers = await userManager.Users.ToListAsync();
        var defaultEmp = await context.Employees.IgnoreQueryFilters().FirstOrDefaultAsync();
        foreach (var u in allUsers)
        {
            if (!u.IsActive)
            {
                u.IsActive = true;
                await userManager.UpdateAsync(u);
            }

            if (u.EmployeeId == null || u.EmployeeId <= 0)
            {
                var matchedEmp = await context.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Email == u.Email);
                if (matchedEmp != null)
                {
                    u.EmployeeId = matchedEmp.Id;
                    await userManager.UpdateAsync(u);
                }
                else if (defaultEmp != null)
                {
                    u.EmployeeId = defaultEmp.Id;
                    await userManager.UpdateAsync(u);
                }
            }

            var uRoles = await userManager.GetRolesAsync(u);
            if (uRoles.Contains("Admin") || 
                uRoles.Contains("Super Admin") ||
                u.Email?.Contains("admin", StringComparison.OrdinalIgnoreCase) == true ||
                u.Email == "hariharanrntgemini@gmail.com")
            {
                if (!uRoles.Contains("Super Admin"))
                {
                    await userManager.AddToRoleAsync(u, "Super Admin");
                }
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
            ("MarriageAnniversaryWishesNotifyAllEmployees", "false", "Broadcast Marriage Anniversary wishes to all active employees"),

            // Task Reminder Notification Settings
            ("TaskReminderFirstMinutes", "30", "Minutes before planned end time for first reminder notification"),
            ("TaskReminderSecondMinutes", "15", "Minutes before planned end time for second reminder notification"),
            ("TaskReminderCompletionEnabled", "true", "Enable notification when planned task duration is fully reached"),

            // Idle Time Notification Settings
            ("IdleNotificationEnabled", "true", "Enable repeating notification alert when employee is continuously idle"),
            ("IdleThresholdMinutes", "5", "Minutes of continuous idle before first alert"),
            ("IdleRepeatIntervalMinutes", "5", "Minutes between repeat alerts while employee remains idle")
        };

        var allDbSettings = await context.SystemSettings.IgnoreQueryFilters().ToListAsync();
        foreach (var setting in defaultSettings)
        {
            var existing = allDbSettings.FirstOrDefault(s => string.Equals(s.Key.Trim(), setting.Key.Trim(), StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                var newSetting = new SystemSetting
                {
                    Key = setting.Key,
                    Value = setting.Value,
                    Description = setting.Description,
                    IsActive = true
                };
                context.SystemSettings.Add(newSetting);
                allDbSettings.Add(newSetting);
            }
            else if (!existing.IsActive)
            {
                existing.IsActive = true;
            }
        }

        // 5. Break Types
        var allDbBreaks = await context.BreakTypes.IgnoreQueryFilters().ToListAsync();
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
            var existing = allDbBreaks.FirstOrDefault(x => string.Equals(x.Name.Trim(), b.Name.Trim(), StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                var newBt = new BreakType { Name = b.Name, AllowedMinutes = b.AllowedMinutes, IsActive = true };
                context.BreakTypes.Add(newBt);
                allDbBreaks.Add(newBt);
            }
            else
            {
                existing.IsActive = true;
                if (existing.AllowedMinutes <= 0) existing.AllowedMinutes = b.AllowedMinutes;
            }
        }

        // Ensure any other break types have a valid positive AllowedMinutes
        foreach (var ub in allDbBreaks.Where(x => x.AllowedMinutes <= 0))
        {
            ub.AllowedMinutes = 15;
        }

        // 6. Support Activity Types
        var allDbSupportTypes = await context.SupportActivityTypes.IgnoreQueryFilters().ToListAsync();
        string[] supportTypes = { "Support Call", "Call", "Meeting", "Discussion", "Demo" };
        foreach (var s in supportTypes)
        {
            var existing = allDbSupportTypes.FirstOrDefault(x => string.Equals(x.Name.Trim(), s.Trim(), StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                var newSt = new SupportActivityType { Name = s, IsActive = true };
                context.SupportActivityTypes.Add(newSt);
                allDbSupportTypes.Add(newSt);
            }
            else if (!existing.IsActive)
            {
                existing.IsActive = true;
            }
        }

        // 7. Leave Types
        var allDbLeaveTypes = await context.LeaveTypes.IgnoreQueryFilters().ToListAsync();
        string[] leaveTypes = { "Casual Leave", "Sick Leave", "Earned Leave" };
        foreach (var l in leaveTypes)
        {
            var existing = allDbLeaveTypes.FirstOrDefault(x => string.Equals(x.Name.Trim(), l.Trim(), StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                var newLt = new LeaveType { Name = l, IsActive = true };
                context.LeaveTypes.Add(newLt);
                allDbLeaveTypes.Add(newLt);
            }
            else if (!existing.IsActive)
            {
                existing.IsActive = true;
            }
        }

        // 8. Seed Default Products & Mappings if missing
        var olmsProd = await context.Products.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "OLMS" || p.Name == "OLMS");
        if (olmsProd == null)
        {
            olmsProd = new Product { Name = "OLMS", Code = "OLMS", IsActive = true };
            context.Products.Add(olmsProd);
            await context.SaveChangesAsync();
        }

        var abcProd = await context.Products.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "ABC" || p.Name == "ABC");
        if (abcProd == null)
        {
            abcProd = new Product { Name = "ABC", Code = "ABC", IsActive = true };
            context.Products.Add(abcProd);
            await context.SaveChangesAsync();
        }

        var xyzProd = await context.Products.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Code == "XYZ" || p.Name == "XYZ");
        if (xyzProd == null)
        {
            xyzProd = new Product { Name = "XYZ", Code = "XYZ", IsActive = true };
            context.Products.Add(xyzProd);
            await context.SaveChangesAsync();
        }

        // Seed Sample Clients if missing
        var clients = await context.Clients.IgnoreQueryFilters().ToListAsync();
        if (!clients.Any())
        {
            var c1 = new Client { CompanyName = "Client A", CustomerName = "Client A Rep", IsActive = true };
            var c2 = new Client { CompanyName = "Client B", CustomerName = "Client B Rep", IsActive = true };
            var c3 = new Client { CompanyName = "Client C", CustomerName = "Client C Rep", IsActive = true };
            context.Clients.AddRange(c1, c2, c3);
            await context.SaveChangesAsync();
            clients = new List<Client> { c1, c2, c3 };
        }

        // Map Clients to OLMS
        foreach (var c in clients)
        {
            var mapExists = await context.ProductClientMappings.IgnoreQueryFilters().AnyAsync(m => m.ProductId == olmsProd.Id && m.ClientId == c.Id);
            if (!mapExists)
            {
                context.ProductClientMappings.Add(new ProductClientMapping { ProductId = olmsProd.Id, ClientId = c.Id, IsActive = true });
            }
        }
        await context.SaveChangesAsync();

        // Ensure employees have OLMS product access if they have none
        var activeEmployees = await context.Employees.Where(e => e.IsActive).ToListAsync();
        foreach (var emp in activeEmployees)
        {
            var hasAccess = await context.EmployeeProductAccesses.AnyAsync(epa => epa.EmployeeId == emp.Id);
            if (!hasAccess)
            {
                context.EmployeeProductAccesses.Add(new EmployeeProductAccess
                {
                    EmployeeId = emp.Id,
                    ProductId = olmsProd.Id,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }
        await context.SaveChangesAsync();

        // 9. Seed Initial Deployment Record matching OLMS Excel Template if empty
        var hasDeployments = await context.ProductDeploymentHistories.AnyAsync();
        if (!hasDeployments && clients.Any())
        {
            var firstClient = clients.First();
            var adminEmpId = adminEmp?.Id ?? activeEmployees.FirstOrDefault()?.Id ?? 1;

            var dep = new ProductDeploymentHistory
            {
                ProductId = olmsProd.Id,
                ClientId = firstClient.Id,
                Issue = "OLMS-101",
                IssueDate = DateTime.UtcNow.AddDays(-15).Date,
                Description = "Order status not updating after dispatch",
                DevelopmentProcess = "Code changes completed for dispatch status sync",
                CurrentStatus = "Testing Completed",
                MovedToTesting = true,
                MovedToTestingBy = adminEmpId,
                MovedToTestingAt = DateTime.UtcNow.AddDays(-10),
                TestingCompleted = true,
                TestingCompletedBy = adminEmpId,
                TestingCompletedAt = DateTime.UtcNow.AddDays(-5),
                DeliveryDate = DateTime.UtcNow.AddDays(-2).Date,
                DeliveredBy = adminEmpId,
                DeliveredAt = DateTime.UtcNow.AddDays(-2),
                Version = "v2.4.1",
                CreatedBy = adminEmpId,
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                ModifiedBy = adminEmpId,
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            };

            context.ProductDeploymentHistories.Add(dep);
            await context.SaveChangesAsync();

            context.ProductDeploymentActivities.AddRange(
                new ProductDeploymentActivity
                {
                    DeploymentId = dep.Id,
                    ActionType = "Created",
                    PreviousStatus = null,
                    NewStatus = "New",
                    Remarks = "Issue logged from customer support ticket",
                    ChangedBy = adminEmpId,
                    ChangedAt = DateTime.UtcNow.AddDays(-15)
                },
                new ProductDeploymentActivity
                {
                    DeploymentId = dep.Id,
                    ActionType = "Status Changed",
                    PreviousStatus = "New",
                    NewStatus = "Development In Progress",
                    Remarks = "Assigned and started development",
                    ChangedBy = adminEmpId,
                    ChangedAt = DateTime.UtcNow.AddDays(-14)
                },
                new ProductDeploymentActivity
                {
                    DeploymentId = dep.Id,
                    ActionType = "Moved to Testing",
                    PreviousStatus = "Development In Progress",
                    NewStatus = "Moved to Testing",
                    Remarks = "Build deployed to QA environment",
                    ChangedBy = adminEmpId,
                    ChangedAt = DateTime.UtcNow.AddDays(-10)
                },
                new ProductDeploymentActivity
                {
                    DeploymentId = dep.Id,
                    ActionType = "Testing Completed",
                    PreviousStatus = "Moved to Testing",
                    NewStatus = "Testing Completed",
                    Remarks = "QA test suite passed with 0 defects",
                    ChangedBy = adminEmpId,
                    ChangedAt = DateTime.UtcNow.AddDays(-5)
                }
            );
            await context.SaveChangesAsync();
        }

        // 10. Seed Dummy Data for last month & current month analysis
        await DummyDataSeeder.SeedDummyDataAsync(context, userManager, roleManager);
    }
}

