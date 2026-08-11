using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Permission;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class PermissionService : IPermissionService
{
    private readonly RiimsDbContext _context;
    private readonly IEmailService _emailService;

    public PermissionService(RiimsDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<PermissionRequestDto> SubmitPermissionAsync(int employeeId, CreatePermissionRequest request)
    {
        var fromTime = TimeSpan.Parse(request.FromTime);
        var toTime = TimeSpan.Parse(request.ToTime);

        if (fromTime >= toTime)
            throw new InvalidOperationException("From Time must be earlier than To Time.");

        var permission = new PermissionRequest
        {
            EmployeeId = employeeId,
            RequestDate = request.RequestDate.Date,
            FromTime = fromTime,
            ToTime = toTime,
            Reason = request.Reason,
            Status = RequestStatus.Pending
        };

        _context.PermissionRequests.Add(permission);
        await _context.SaveChangesAsync();

        // Send email notification to Admin & Manager
        await SendNewPermissionRequestNotificationAsync(permission);

        return (await GetByIdAsync(permission.Id))!;
    }

    private async Task SendNewPermissionRequestNotificationAsync(PermissionRequest p)
    {
        try
        {
            var emp = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.ReportingPerson)
                .FirstOrDefaultAsync(e => e.Id == p.EmployeeId);

            if (emp == null) return;

            var adminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
            var adminEmails = new List<string>();
            if (adminRole != null)
            {
                var adminUserIds = await _context.UserRoles
                    .Where(ur => ur.RoleId == adminRole.Id)
                    .Select(ur => ur.UserId)
                    .ToListAsync();

                adminEmails = await _context.Users
                    .Where(u => adminUserIds.Contains(u.Id) && !string.IsNullOrEmpty(u.Email))
                    .Select(u => u.Email!)
                    .ToListAsync();
            }

            if (adminEmails.Count == 0) adminEmails.Add("admin@riims.local");

            if (emp.ReportingPerson != null && !string.IsNullOrEmpty(emp.ReportingPerson.Email) && !adminEmails.Contains(emp.ReportingPerson.Email))
            {
                adminEmails.Add(emp.ReportingPerson.Email);
            }

            var subject = $"RIMS — New Permission Request Received from {emp.Name} ({emp.EmployeeCode})";
            var body = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"">
                <div style=""background: #2563eb; color: #ffffff; padding: 20px; text-align: center;"">
                    <h2 style=""margin: 0;"">New Permission Request Received</h2>
                    <p style=""margin: 5px 0 0 0; font-size: 14px;"">Action Required in Approval Queue</p>
                </div>
                <div style=""padding: 25px; color: #1e293b;"">
                    <p style=""font-size: 16px;"">A new short permission request has been submitted by <strong>{emp.Name}</strong> ({emp.EmployeeCode}).</p>

                    <div style=""background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;"">
                        <p style=""margin: 0 0 8px 0;""><strong>Employee:</strong> {emp.Name} ({emp.EmployeeCode})</p>
                        <p style=""margin: 0 0 8px 0;""><strong>Department:</strong> {emp.Department?.Name ?? "N/A"}</p>
                        <p style=""margin: 0 0 8px 0;""><strong>Date & Time Window:</strong> {p.RequestDate:yyyy-MM-dd} ({p.FromTime:hh\\:mm} to {p.ToTime:hh\\:mm})</p>
                        <p style=""margin: 0;""><strong>Reason:</strong> ""{p.Reason}""</p>
                    </div>

                    <div style=""text-align: center; margin-top: 30px;"">
                        <a href=""http://localhost:3000/admin/approvals"" style=""background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Review & Approve Request</a>
                    </div>
                </div>
                <div style=""background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;"">
                    RIMS Notification System
                </div>
            </div>";

            foreach (var email in adminEmails)
            {
                await _emailService.SendEmailAsync(email, subject, body);
            }
        }
        catch
        {
        }
    }

    public async Task<List<PermissionRequestDto>> GetEmployeePermissionsAsync(int employeeId)
    {
        var items = await _context.PermissionRequests
            .Include(p => p.Employee)
                .ThenInclude(e => e.Department)
            .Include(p => p.Approver)
            .Where(p => p.EmployeeId == employeeId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return items.Select(MapToDto).ToList();
    }

    public async Task<List<PermissionRequestDto>> GetPendingApprovalsAsync(int currentEmployeeId, bool isAdmin)
    {
        var query = _context.PermissionRequests
            .Include(p => p.Employee)
                .ThenInclude(e => e.Department)
            .Include(p => p.Approver)
            .Where(p => p.Status == RequestStatus.Pending)
            .AsQueryable();

        if (!isAdmin)
        {
            query = query.Where(p => p.Employee.ReportingPersonId == currentEmployeeId);
        }

        var items = await query.OrderBy(p => p.CreatedAt).ToListAsync();
        return items.Select(MapToDto).ToList();
    }

    public async Task ApprovePermissionAsync(int permissionRequestId, int approverEmployeeId)
    {
        var p = await _context.PermissionRequests
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == permissionRequestId);

        if (p == null)
            throw new KeyNotFoundException("Permission request not found.");

        p.Status = RequestStatus.Approved;
        p.ApprovedBy = approverEmployeeId;
        p.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        try
        {
            await _emailService.SendEmailAsync(
                p.Employee.Email,
                "RIMS - Permission Request Approved",
                $"Hello {p.Employee.Name},\n\nYour permission request for {p.RequestDate:yyyy-MM-dd} ({p.FromTime:hh\\:mm} to {p.ToTime:hh\\:mm}) has been APPROVED.\n\nRegards,\nRIMS Approval Engine");
        }
        catch
        {
        }
    }

    public async Task RejectPermissionAsync(int permissionRequestId, int approverEmployeeId)
    {
        var p = await _context.PermissionRequests
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == permissionRequestId);

        if (p == null)
            throw new KeyNotFoundException("Permission request not found.");

        p.Status = RequestStatus.Rejected;
        p.ApprovedBy = approverEmployeeId;
        p.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        try
        {
            await _emailService.SendEmailAsync(
                p.Employee.Email,
                "RIMS - Permission Request Rejected",
                $"Hello {p.Employee.Name},\n\nYour permission request for {p.RequestDate:yyyy-MM-dd} ({p.FromTime:hh\\:mm} to {p.ToTime:hh\\:mm}) has been REJECTED.\n\nRegards,\nRIMS Approval Engine");
        }
        catch
        {
        }
    }

    private async Task<PermissionRequestDto?> GetByIdAsync(int id)
    {
        var p = await _context.PermissionRequests
            .Include(req => req.Employee)
                .ThenInclude(e => e.Department)
            .Include(req => req.Approver)
            .FirstOrDefaultAsync(req => req.Id == id);

        return p != null ? MapToDto(p) : null;
    }

    private static PermissionRequestDto MapToDto(PermissionRequest p) => new()
    {
        Id = p.Id,
        EmployeeId = p.EmployeeId,
        EmployeeName = p.Employee.Name,
        EmployeeCode = p.Employee.EmployeeCode,
        DepartmentName = p.Employee.Department?.Name ?? string.Empty,
        RequestDate = p.RequestDate,
        FromTime = p.FromTime.ToString(@"hh\:mm"),
        ToTime = p.ToTime.ToString(@"hh\:mm"),
        Reason = p.Reason,
        Status = p.Status.ToString(),
        ApprovedBy = p.ApprovedBy,
        ApproverName = p.Approver?.Name,
        ApprovedAt = p.ApprovedAt,
        CreatedAt = p.CreatedAt
    };
}
