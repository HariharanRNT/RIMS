using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Identity;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Data;

public static class DummyDataSeeder
{
    public static async Task SeedDummyDataAsync(RiimsDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole<int>> roleManager)
    {
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

        // 9. Lookup IDs for Break Types, Support Activity Types, Leave Types
        var bioBreak = await context.BreakTypes.FirstOrDefaultAsync(b => b.Name == "Bio Break");
        var teaBreak = await context.BreakTypes.FirstOrDefaultAsync(b => b.Name == "Tea Break");
        var lunchBreak = await context.BreakTypes.FirstOrDefaultAsync(b => b.Name == "Lunch Break");

        var supportCall = await context.SupportActivityTypes.FirstOrDefaultAsync(s => s.Name == "Support Call");
        var demoType = await context.SupportActivityTypes.FirstOrDefaultAsync(s => s.Name == "Demo");
        var meetingType = await context.SupportActivityTypes.FirstOrDefaultAsync(s => s.Name == "Meeting");

        var casualLeave = await context.LeaveTypes.FirstOrDefaultAsync(l => l.Name == "Casual Leave");
        var sickLeave = await context.LeaveTypes.FirstOrDefaultAsync(l => l.Name == "Sick Leave");

        // 10. Generate Historical & Current Data for Last Month and Current Month
        var nowUtc = DateTime.UtcNow;
        var istOffset = TimeSpan.FromHours(5.5);

        // Date range: 1st of Last Month to Today
        var lastMonthFirstDay = new DateTime(nowUtc.Year, nowUtc.Month, 1).AddMonths(-1);
        var endDate = nowUtc.Date;

        var modules = new[] { "Authentication & Security", "Dashboard & Analytics", "Payroll Calculation Engine", "Report Generation PDF/Excel", "Client Onboarding", "Support Ticket Routing", "UI Component Polish" };
        var random = new Random(42); // Fixed seed for reproducible realistic data

        for (var date = lastMonthFirstDay; date <= endDate; date = date.AddDays(1))
        {
            // Skip weekends
            if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                continue;

            foreach (var emp in createdEmployees)
            {
                // Leave simulation: skip data generation for 1-2 specific leave days
                if (date.Day == 15 && emp.EmployeeCode == "EMP-003") continue; // Sarah on leave
                if (date.Day == 22 && emp.EmployeeCode == "EMP-004") continue; // Alex on leave

                // Login time around 08:50 AM to 09:25 AM IST
                bool isLate = (date.Day % 7 == emp.Id % 5); // Simulated occasional late arrival
                var loginIstTime = date.AddHours(8).AddMinutes(50 + (isLate ? 35 : random.Next(0, 15)));
                var logoutIstTime = date.AddHours(18).AddMinutes(random.Next(5, 30));

                var loginUtc = loginIstTime.Subtract(istOffset);
                var logoutUtc = logoutIstTime.Subtract(istOffset);

                // Attendance Log
                var attLog = new AttendanceLog
                {
                    EmployeeId = emp.Id,
                    LoginTime = loginUtc,
                    LogoutTime = logoutUtc
                };
                context.AttendanceLogs.Add(attLog);

                // Grace Time Violation if loginIstTime > 09:15 AM
                if (loginIstTime.TimeOfDay > new TimeSpan(9, 15, 0))
                {
                    int minsLate = (int)(loginIstTime.TimeOfDay - new TimeSpan(9, 0, 0)).TotalMinutes;
                    context.GraceTimeViolations.Add(new GraceTimeViolation
                    {
                        EmployeeId = emp.Id,
                        Date = date.Date,
                        LoginTime = loginIstTime.TimeOfDay,
                        MinutesLate = minsLate
                    });
                }

                // Work Task & Task Time Logs
                var prod = products[emp.Id % products.Count];
                var client = clients[emp.Id % clients.Count];
                var module = modules[(emp.Id + date.Day) % modules.Length];

                var workTask = new WorkTask
                {
                    EmployeeId = emp.Id,
                    ProductId = prod.Id,
                    ClientId = client.Id,
                    ModuleName = module,
                    Description = $"Development and testing for {module} module.",
                    Status = TaskStatusEnum.Completed
                };
                context.WorkTasks.Add(workTask);
                await context.SaveChangesAsync();

                // Morning Task Time Log (09:30 - 13:00 IST)
                var taskStart1Utc = date.AddHours(9).AddMinutes(30).Subtract(istOffset);
                var taskEnd1Utc = date.AddHours(13).AddMinutes(0).Subtract(istOffset);
                context.TaskTimeLogs.Add(new TaskTimeLog
                {
                    TaskId = workTask.Id,
                    StartTime = taskStart1Utc,
                    EndTime = taskEnd1Utc
                });

                // Afternoon Task Time Log (14:00 - 17:30 IST)
                var taskStart2Utc = date.AddHours(14).AddMinutes(0).Subtract(istOffset);
                var taskEnd2Utc = date.AddHours(17).AddMinutes(30).Subtract(istOffset);
                context.TaskTimeLogs.Add(new TaskTimeLog
                {
                    TaskId = workTask.Id,
                    StartTime = taskStart2Utc,
                    EndTime = taskEnd2Utc
                });

                // Break Logs
                if (teaBreak != null)
                {
                    var teaStartUtc = date.AddHours(11).AddMinutes(0).Subtract(istOffset);
                    var teaEndUtc = date.AddHours(11).AddMinutes(15).Subtract(istOffset);
                    context.BreakLogs.Add(new BreakLog
                    {
                        EmployeeId = emp.Id,
                        BreakTypeId = teaBreak.Id,
                        HeldTaskId = workTask.Id,
                        StartTime = teaStartUtc,
                        EndTime = teaEndUtc
                    });
                }

                if (lunchBreak != null)
                {
                    var lunchStartUtc = date.AddHours(13).AddMinutes(0).Subtract(istOffset);
                    var lunchEndUtc = date.AddHours(14).AddMinutes(0).Subtract(istOffset);
                    context.BreakLogs.Add(new BreakLog
                    {
                        EmployeeId = emp.Id,
                        BreakTypeId = lunchBreak.Id,
                        HeldTaskId = workTask.Id,
                        StartTime = lunchStartUtc,
                        EndTime = lunchEndUtc
                    });
                }

                // Support Activity Log (for Support employee or selected days)
                if (emp.EmployeeCode == "EMP-005" || date.Day % 4 == 0)
                {
                    var actType = (date.Day % 3 == 0) ? demoType : (date.Day % 2 == 0 ? supportCall : meetingType);
                    if (actType != null)
                    {
                        var suppStartUtc = date.AddHours(15).AddMinutes(0).Subtract(istOffset);
                        var suppEndUtc = date.AddHours(16).AddMinutes(0).Subtract(istOffset);

                        var suppLog = new SupportActivityLog
                        {
                            EmployeeId = emp.Id,
                            ActivityTypeId = actType.Id,
                            HeldTaskId = workTask.Id,
                            ProductId = prod.Id,
                            ClientId = client.Id,
                            Remarks = $"Client session for {prod.Name} with {client.CompanyName}",
                            StartTime = suppStartUtc,
                            EndTime = suppEndUtc
                        };
                        context.SupportActivityLogs.Add(suppLog);
                        await context.SaveChangesAsync();

                        // If Demo, add DemoFollowUp
                        if (actType.Name == "Demo")
                        {
                            context.DemoFollowUps.Add(new DemoFollowUp
                            {
                                EmployeeId = emp.Id,
                                SupportActivityLogId = suppLog.Id,
                                ProductId = prod.Id,
                                ClientId = client.Id,
                                ReviewRemarks = "Product demonstration presented. Client requested proposal.",
                                FollowUpDate = date.AddDays(3),
                                Status = date < nowUtc.AddDays(-2) ? DemoFollowUpStatus.Completed : DemoFollowUpStatus.Pending,
                                CompletedAt = date < nowUtc.AddDays(-2) ? date.AddDays(3) : null
                            });
                        }
                    }
                }

                // Activity Timeline entries
                context.ActivityTimelines.Add(new ActivityTimeline
                {
                    EmployeeId = emp.Id,
                    ActivityType = "Login",
                    RefTable = "AttendanceLogs",
                    RefId = attLog.Id,
                    StartTime = loginUtc,
                    EndTime = logoutUtc,
                    Status = "Completed",
                    Remarks = "Day attendance logged."
                });
            }
        }

        await context.SaveChangesAsync();

        // 11. Leave Requests & Permission Requests
        if (!await context.LeaveRequests.AnyAsync() && casualLeave != null && sickLeave != null)
        {
            var leave1 = new LeaveRequest
            {
                EmployeeId = createdEmployees[2].Id, // Sarah
                LeaveTypeId = casualLeave.Id,
                FromDate = lastMonthFirstDay.AddDays(14),
                ToDate = lastMonthFirstDay.AddDays(14),
                Reason = "Personal work",
                Status = RequestStatus.Approved,
                ApprovedBy = adminEmp.Id,
                ApprovedAt = lastMonthFirstDay.AddDays(12)
            };

            var leave2 = new LeaveRequest
            {
                EmployeeId = createdEmployees[3].Id, // Alex
                LeaveTypeId = sickLeave.Id,
                FromDate = lastMonthFirstDay.AddDays(21),
                ToDate = lastMonthFirstDay.AddDays(21),
                Reason = "Fever & Doctor appointment",
                Status = RequestStatus.Approved,
                ApprovedBy = adminEmp.Id,
                ApprovedAt = lastMonthFirstDay.AddDays(22)
            };

            var leave3 = new LeaveRequest
            {
                EmployeeId = createdEmployees[1].Id, // John
                LeaveTypeId = casualLeave.Id,
                FromDate = nowUtc.AddDays(5),
                ToDate = nowUtc.AddDays(6),
                Reason = "Family function",
                Status = RequestStatus.Pending
            };

            context.LeaveRequests.AddRange(leave1, leave2, leave3);
        }

        if (!await context.PermissionRequests.AnyAsync())
        {
            var perm1 = new PermissionRequest
            {
                EmployeeId = createdEmployees[1].Id,
                RequestDate = lastMonthFirstDay.AddDays(10),
                FromTime = new TimeSpan(16, 0, 0),
                ToTime = new TimeSpan(18, 0, 0),
                Reason = "Bank official work",
                Status = RequestStatus.Approved,
                ApprovedBy = adminEmp.Id,
                ApprovedAt = lastMonthFirstDay.AddDays(9)
            };

            var perm2 = new PermissionRequest
            {
                EmployeeId = createdEmployees[4].Id,
                RequestDate = lastMonthFirstDay.AddDays(18),
                FromTime = new TimeSpan(9, 0, 0),
                ToTime = new TimeSpan(11, 0, 0),
                Reason = "Vehicle service",
                Status = RequestStatus.Approved,
                ApprovedBy = adminEmp.Id,
                ApprovedAt = lastMonthFirstDay.AddDays(17)
            };

            context.PermissionRequests.AddRange(perm1, perm2);
        }

        await context.SaveChangesAsync();

        // 12. Payroll / Payslip Details for Last Month
        int lastMonthVal = lastMonthFirstDay.Month;
        int lastMonthYearVal = lastMonthFirstDay.Year;

        if (!await context.PayslipDetails.AnyAsync(p => p.Month == lastMonthVal && p.Year == lastMonthYearVal))
        {
            foreach (var emp in createdEmployees)
            {
                decimal basic = emp.EmployeeCode == "EMP-001" ? 60000m : sampleEmpSpecs.FirstOrDefault(s => s.Code == emp.EmployeeCode)?.Basic ?? 40000m;
                decimal hra = Math.Round(basic * 0.40m, 2);
                decimal conveyance = 2000m;
                decimal medical = 1250m;
                decimal allowances = 3000m;
                decimal arrears = 0m;
                decimal totalSalary = basic + hra + conveyance + medical + allowances + arrears;

                decimal esi = Math.Round(totalSalary * 0.0075m, 2);
                decimal pf = Math.Round(basic * 0.12m, 2);
                decimal parking = 200m;
                decimal tds = basic > 50000m ? 2500m : 1000m;

                decimal lopDays = emp.EmployeeCode == "EMP-003" ? 1.0m : 0.0m;
                decimal lopDeduction = Math.Round((totalSalary / 30m) * lopDays, 2);

                decimal totalDeduction = esi + pf + parking + tds + lopDeduction;
                decimal netPay = totalSalary - totalDeduction;

                var payslip = new PayslipDetail
                {
                    EmployeeId = emp.Id,
                    Month = lastMonthVal,
                    Year = lastMonthYearVal,
                    BasicPay = basic,
                    Hra = hra,
                    Conveyance = conveyance,
                    Medical = medical,
                    Allowances = allowances,
                    Arrears = arrears,
                    TotalSalary = totalSalary,
                    LopDeduction = lopDeduction,
                    Esi = esi,
                    Pf = pf,
                    ParkingCharges = parking,
                    Tds = tds,
                    TotalDeduction = totalDeduction,
                    NetPay = netPay,
                    LOPDays = lopDays,
                    LeavesTaken = lopDays > 0 ? 1 : 0,
                    PermissionsUsed = 1,
                    GraceViolations = 2
                };
                context.PayslipDetails.Add(payslip);

                if (lopDays > 0)
                {
                    context.LOPCalculations.Add(new LOPCalculation
                    {
                        EmployeeId = emp.Id,
                        Month = lastMonthVal,
                        Year = lastMonthYearVal,
                        LOPDays = lopDays,
                        Reason = "Unapproved leave on 15th of last month"
                    });
                }
            }

            // Monthly Report Log
            context.MonthlyReportLogs.Add(new MonthlyReportLog
            {
                Month = lastMonthVal,
                Year = lastMonthYearVal,
                SentAt = lastMonthFirstDay.AddMonths(1).AddDays(1),
                RecipientEmail = "management@riims.local",
                FilePath = $"exports/monthly_report_{lastMonthYearVal}_{lastMonthVal:D2}.pdf"
            });
        }

        await context.SaveChangesAsync();
    }
}
