using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Employee;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using RIIMS.Infrastructure.Identity;

namespace RIIMS.Infrastructure.Services;

public class EmployeeService : IEmployeeService
{
    private readonly RiimsDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailService _emailService;
    private readonly ISalaryStructureService _salaryStructureService;

    public EmployeeService(
        RiimsDbContext context,
        UserManager<ApplicationUser> userManager,
        IEmailService emailService,
        ISalaryStructureService salaryStructureService)
    {
        _context = context;
        _userManager = userManager;
        _emailService = emailService;
        _salaryStructureService = salaryStructureService;
    }

    public async Task<PagedResult<EmployeeListDto>> GetAllAsync(int page, int pageSize, int? departmentId = null, string? search = null)
    {
        var query = _context.Employees
            .IgnoreQueryFilters()
            .Where(e => e.IsActive)
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .AsQueryable();

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => e.Name.Contains(search) || e.EmployeeCode.Contains(search) || e.Email.Contains(search));

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(e => e.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EmployeeListDto
            {
                Id = e.Id,
                EmployeeCode = e.EmployeeCode,
                Name = e.Name,
                Email = e.Email,
                DepartmentName = e.Department != null ? e.Department.Name : "Unassigned",
                DesignationName = e.Designation != null ? e.Designation.Name : "Unassigned",
                IsActive = e.IsActive
            })
            .ToListAsync();

        return new PagedResult<EmployeeListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<EmployeeDto?> GetByIdAsync(int id)
    {
        var e = await _context.Employees
            .IgnoreQueryFilters()
            .Where(emp => emp.IsActive)
            .Include(emp => emp.Department)
            .Include(emp => emp.Designation)
            .Include(emp => emp.ReportingPerson)
            .FirstOrDefaultAsync(emp => emp.Id == id);

        if (e == null) return null;

        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.EmployeeId == id);

        return new EmployeeDto
        {
            Id = e.Id,
            EmployeeCode = e.EmployeeCode,
            Name = e.Name,
            Email = e.Email,
            Phone = e.Phone,
            FatherName = e.FatherName,
            MotherName = e.MotherName,
            EmergencyContact1 = e.EmergencyContact1,
            EmergencyContact2 = e.EmergencyContact2,
            DepartmentId = e.DepartmentId,
            DepartmentName = e.Department.Name,
            DesignationId = e.DesignationId,
            DesignationName = e.Designation.Name,
            DesignationFromDate = e.DesignationFromDate,
            ReportingPersonId = e.ReportingPersonId,
            ReportingPersonName = e.ReportingPerson?.Name,
            DateOfJoining = e.DateOfJoining,
            CompanyName = e.CompanyName,
            Gender = e.Gender,
            DateOfBirth = e.DateOfBirth,
            CompanyAnniversaryDate = e.CompanyAnniversaryDate,
            MaritalStatus = e.MaritalStatus,
            MarriageDate = e.MarriageDate,
            PfNumber = e.PfNumber,
            PanNumber = e.PanNumber,
            EsiNumber = e.EsiNumber,
            AadhaarNumber = e.AadhaarNumber,
            Username = user?.UserName ?? e.Email,
            IsActive = e.IsActive
        };
    }

    public async Task<EmployeeDto?> GetMyProfileAsync(int employeeId, int? userId = null)
    {
        if (employeeId > 0)
        {
            var emp = await GetByIdAsync(employeeId);
            if (emp != null) return emp;
        }

        if (userId.HasValue && userId.Value > 0)
        {
            var user = await _userManager.FindByIdAsync(userId.Value.ToString());
            if (user != null)
            {
                if (user.EmployeeId.HasValue && user.EmployeeId.Value > 0)
                {
                    return await GetByIdAsync(user.EmployeeId.Value);
                }

                if (!string.IsNullOrWhiteSpace(user.Email))
                {
                    var empByEmail = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Email.ToLower() == user.Email.ToLower());
                    if (empByEmail != null)
                    {
                        return await GetByIdAsync(empByEmail.Id);
                    }
                }
            }
        }

        return null;
    }

    public async Task<EmployeeDto> CreateAsync(CreateEmployeeRequest request, int createdBy)
    {
        var normalizedEmail = request.Email.Trim().ToLower();
        var normalizedCode = request.EmployeeCode.Trim();

        if (await _context.Employees.AnyAsync(e => e.Email.ToLower() == normalizedEmail))
            throw new InvalidOperationException("This email address is already registered.");
        if (await _context.Employees.AnyAsync(e => e.EmployeeCode.ToUpper() == normalizedCode.ToUpper()))
            throw new InvalidOperationException("Employee code already exists.");

        if (!await _context.Departments.AnyAsync(d => d.Id == request.DepartmentId && d.IsActive))
            throw new InvalidOperationException("Please select an active department.");
        if (!await _context.Designations.AnyAsync(d => d.Id == request.DesignationId && d.IsActive))
            throw new InvalidOperationException("Please select an active designation.");

        var employee = new Employee
        {
            EmployeeCode = normalizedCode,
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            Phone = !string.IsNullOrWhiteSpace(request.Phone) ? request.Phone.Trim() : null,
            FatherName = !string.IsNullOrWhiteSpace(request.FatherName) ? request.FatherName.Trim() : null,
            MotherName = !string.IsNullOrWhiteSpace(request.MotherName) ? request.MotherName.Trim() : null,
            EmergencyContact1 = !string.IsNullOrWhiteSpace(request.EmergencyContact1) ? request.EmergencyContact1.Trim() : null,
            EmergencyContact2 = !string.IsNullOrWhiteSpace(request.EmergencyContact2) ? request.EmergencyContact2.Trim() : null,
            DepartmentId = request.DepartmentId,
            DesignationId = request.DesignationId,
            DesignationFromDate = request.DesignationFromDate,
            ReportingPersonId = request.ReportingPersonId,
            DateOfJoining = request.DateOfJoining.Date,
            CompanyName = !string.IsNullOrWhiteSpace(request.CompanyName) ? request.CompanyName.Trim() : null,
            Gender = !string.IsNullOrWhiteSpace(request.Gender) ? request.Gender.Trim() : null,
            DateOfBirth = request.DateOfBirth?.Date,
            CompanyAnniversaryDate = request.CompanyAnniversaryDate?.Date,
            MaritalStatus = !string.IsNullOrWhiteSpace(request.MaritalStatus) ? request.MaritalStatus.Trim() : null,
            MarriageDate = request.MarriageDate?.Date,
            PfNumber = !string.IsNullOrWhiteSpace(request.PfNumber) ? request.PfNumber.Trim() : null,
            PanNumber = !string.IsNullOrWhiteSpace(request.PanNumber) ? request.PanNumber.Trim() : null,
            EsiNumber = !string.IsNullOrWhiteSpace(request.EsiNumber) ? request.EsiNumber.Trim() : null,
            AadhaarNumber = !string.IsNullOrWhiteSpace(request.AadhaarNumber) ? request.AadhaarNumber.Trim() : null,
            CreatedBy = createdBy
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        var tempPassword = !string.IsNullOrWhiteSpace(request.Password)
            ? request.Password.Trim()
            : GenerateTempPassword();

        var user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            EmployeeId = employee.Id,
            MustChangePassword = true
        };

        var result = await _userManager.CreateAsync(user, tempPassword);
        if (!result.Succeeded)
        {
            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();
            throw new InvalidOperationException("Failed to create user account: " +
                string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        await _userManager.AddToRoleAsync(user, "Employee");

        // Create Payroll Salary Structure if Annual CTC is provided
        if (request.AnnualCTC.HasValue && request.AnnualCTC.Value > 0)
        {
            await _salaryStructureService.CreateOrUpdateSalaryStructureAsync(employee.Id, new CreateSalaryStructureDto
            {
                AnnualCTC = request.AnnualCTC.Value,
                SalaryConfigurationMode = request.SalaryConfigurationMode,
                EffectiveFrom = request.SalaryEffectiveFrom ?? request.DateOfJoining,
                PFApplicable = request.PFApplicable,
                ESIApplicable = request.ESIApplicable,
                ProfessionalTaxApplicable = request.ProfessionalTaxApplicable,
                TDSApplicable = request.TDSApplicable,
                Components = request.SalaryComponents ?? new()
            });
        }

        try
        {
            var htmlBody = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"">
                <div style=""background: #2563eb; color: #ffffff; padding: 20px; text-align: center;"">
                    <h2 style=""margin: 0;"">Welcome to RIMS</h2>
                    <p style=""margin: 5px 0 0 0; font-size: 14px;"">Resource & Integrated Information Management System</p>
                </div>
                <div style=""padding: 25px; color: #1e293b;"">
                    <p style=""font-size: 16px;"">Hello <strong>{employee.Name}</strong>,</p>
                    <p>Your official employee account has been created by the Administrator.</p>
                    
                    <div style=""background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;"">
                        <p style=""margin: 0 0 8px 0;""><strong>Username / Email:</strong> <span style=""color: #2563eb;"">{normalizedEmail}</span></p>
                        <p style=""margin: 0 0 8px 0;""><strong>Employee Code:</strong> {normalizedCode}</p>
                        <p style=""margin: 0;""><strong>Temporary Password:</strong> <span style=""font-family: monospace; font-weight: bold; color: #d97706;"">{tempPassword}</span></p>
                    </div>

                    <p style=""font-size: 14px; color: #64748b;"">
                        * You will be required to change your password upon your first login.
                    </p>
                    
                    <div style=""text-align: center; margin-top: 30px;"">
                        <a href=""http://localhost:3000/login"" style=""background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Login to Portal</a>
                    </div>
                </div>
                <div style=""background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;"">
                    RIMS Automated Account Notification System
                </div>
            </div>";

            await _emailService.SendEmailAsync(
                normalizedEmail,
                "RIMS — Welcome to the Team (Your Account Credentials)",
                htmlBody);
        }
        catch
        {
        }

        var dto = (await GetByIdAsync(employee.Id))!;
        dto.TemporaryPassword = tempPassword;
        return dto;
    }

    public async Task<EmployeeDto> UpdateAsync(int id, UpdateEmployeeRequest request)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null)
            throw new KeyNotFoundException($"Employee with Id {id} not found.");

        var normalizedEmail = request.Email.Trim().ToLower();

        if (await _context.Employees.AnyAsync(e => e.Email.ToLower() == normalizedEmail && e.Id != id))
            throw new InvalidOperationException("This email address is already registered.");

        if (!await _context.Departments.AnyAsync(d => d.Id == request.DepartmentId && d.IsActive))
            throw new InvalidOperationException("Please select an active department.");
        if (!await _context.Designations.AnyAsync(d => d.Id == request.DesignationId && d.IsActive))
            throw new InvalidOperationException("Please select an active designation.");

        employee.Name = request.Name.Trim();
        employee.Email = normalizedEmail;
        employee.Phone = !string.IsNullOrWhiteSpace(request.Phone) ? request.Phone.Trim() : null;
        employee.FatherName = !string.IsNullOrWhiteSpace(request.FatherName) ? request.FatherName.Trim() : null;
        employee.MotherName = !string.IsNullOrWhiteSpace(request.MotherName) ? request.MotherName.Trim() : null;
        employee.EmergencyContact1 = !string.IsNullOrWhiteSpace(request.EmergencyContact1) ? request.EmergencyContact1.Trim() : null;
        employee.EmergencyContact2 = !string.IsNullOrWhiteSpace(request.EmergencyContact2) ? request.EmergencyContact2.Trim() : null;
        employee.DepartmentId = request.DepartmentId;
        employee.DesignationId = request.DesignationId;
        employee.DesignationFromDate = request.DesignationFromDate;
        employee.ReportingPersonId = request.ReportingPersonId;
        employee.DateOfJoining = request.DateOfJoining.Date;
        employee.CompanyName = !string.IsNullOrWhiteSpace(request.CompanyName) ? request.CompanyName.Trim() : null;
        employee.Gender = !string.IsNullOrWhiteSpace(request.Gender) ? request.Gender.Trim() : null;
        employee.DateOfBirth = request.DateOfBirth?.Date;
        employee.CompanyAnniversaryDate = request.CompanyAnniversaryDate?.Date;
        employee.MaritalStatus = !string.IsNullOrWhiteSpace(request.MaritalStatus) ? request.MaritalStatus.Trim() : null;
        employee.MarriageDate = string.Equals(request.MaritalStatus, "Married", StringComparison.OrdinalIgnoreCase) ? request.MarriageDate?.Date : null;
        employee.PfNumber = !string.IsNullOrWhiteSpace(request.PfNumber) ? request.PfNumber.Trim() : null;
        employee.PanNumber = !string.IsNullOrWhiteSpace(request.PanNumber) ? request.PanNumber.Trim() : null;
        employee.EsiNumber = !string.IsNullOrWhiteSpace(request.EsiNumber) ? request.EsiNumber.Trim() : null;
        employee.AadhaarNumber = !string.IsNullOrWhiteSpace(request.AadhaarNumber) ? request.AadhaarNumber.Trim() : null;

        await _context.SaveChangesAsync();

        if (request.AnnualCTC.HasValue && request.AnnualCTC.Value >= 0)
        {
            await _salaryStructureService.CreateOrUpdateSalaryStructureAsync(id, new CreateSalaryStructureDto
            {
                AnnualCTC = request.AnnualCTC.Value,
                SalaryConfigurationMode = request.SalaryConfigurationMode,
                EffectiveFrom = request.SalaryEffectiveFrom ?? employee.DateOfJoining,
                PFApplicable = request.PFApplicable,
                ESIApplicable = request.ESIApplicable,
                ProfessionalTaxApplicable = request.ProfessionalTaxApplicable,
                TDSApplicable = request.TDSApplicable,
                Components = request.SalaryComponents ?? new()
            });
        }

        return (await GetByIdAsync(id))!;
    }

    public async Task DeleteAsync(int id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee == null) return;

        employee.IsActive = false;
        await _context.SaveChangesAsync();
    }

    public async Task<EmployeeWorkDetailDto?> GetWorkDetailAsync(int employeeId)
    {
        var detail = await _context.EmployeeWorkDetails
            .FirstOrDefaultAsync(d => d.EmployeeId == employeeId);

        if (detail == null) return null;

        return new EmployeeWorkDetailDto
        {
            Id = detail.Id,
            EmployeeId = detail.EmployeeId,
            ShiftStart = detail.ShiftStart.ToString(@"hh\:mm"),
            ShiftEnd = detail.ShiftEnd.ToString(@"hh\:mm"),
            WorkLocation = detail.WorkLocation.ToString(),
            EmploymentType = detail.EmploymentType.ToString()
        };
    }

    public async Task<EmployeeWorkDetailDto> UpdateWorkDetailAsync(int employeeId, UpdateWorkDetailRequest request)
    {
        var detail = await _context.EmployeeWorkDetails
            .FirstOrDefaultAsync(d => d.EmployeeId == employeeId);

        var shiftStart = TimeSpan.Parse(request.ShiftStart);
        var shiftEnd = TimeSpan.Parse(request.ShiftEnd);
        var workLocation = Enum.Parse<WorkLocation>(request.WorkLocation, true);
        var employmentType = Enum.Parse<EmploymentType>(request.EmploymentType, true);

        if (detail == null)
        {
            detail = new EmployeeWorkDetail
            {
                EmployeeId = employeeId,
                ShiftStart = shiftStart,
                ShiftEnd = shiftEnd,
                WorkLocation = workLocation,
                EmploymentType = employmentType
            };
            _context.EmployeeWorkDetails.Add(detail);
        }
        else
        {
            detail.ShiftStart = shiftStart;
            detail.ShiftEnd = shiftEnd;
            detail.WorkLocation = workLocation;
            detail.EmploymentType = employmentType;
        }

        await _context.SaveChangesAsync();

        return new EmployeeWorkDetailDto
        {
            Id = detail.Id,
            EmployeeId = detail.EmployeeId,
            ShiftStart = detail.ShiftStart.ToString(@"hh\:mm"),
            ShiftEnd = detail.ShiftEnd.ToString(@"hh\:mm"),
            WorkLocation = detail.WorkLocation.ToString(),
            EmploymentType = detail.EmploymentType.ToString()
        };
    }

    private static string GenerateTempPassword()
    {
        var random = new Random();
        return $"Riims@{random.Next(100000, 999999)}";
    }
}
