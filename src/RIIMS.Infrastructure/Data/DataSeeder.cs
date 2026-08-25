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
                "MasterData.View", "MasterData.Manage"
            },
            ["Employee"] = new[]
            {
                "Leave.Create", "Task.View", "AttendanceCalendar.View"
            },
            ["Admin"] = permissionDefinitions.Select(p => p.Code).ToArray()
        };

        foreach (var (roleName, permCodes) in rolePermissionsMap)
        {
            if (!roleEntityDict.TryGetValue(roleName, out var role)) continue;

            var existingRolePerms = await context.RolePermissions
                .Where(rp => rp.RoleId == role.Id)
                .ToListAsync();

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

        // 5. Admin Employee & Identity User (admin@riims.local) -> Super Admin
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

        // 5c. Automatically migrate all existing users and ensure IsActive = true
        var allUsers = await userManager.Users.ToListAsync();
        foreach (var u in allUsers)
        {
            if (!u.IsActive)
            {
                u.IsActive = true;
                await userManager.UpdateAsync(u);
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

