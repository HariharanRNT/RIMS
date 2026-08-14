using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Leave;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class LeaveService : ILeaveService
{
    private readonly RiimsDbContext _context;
    private readonly IEmailService _emailService;

    public LeaveService(RiimsDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<LeaveRequestDto> SubmitLeaveAsync(int employeeId, CreateLeaveRequest request)
    {
        var leave = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveTypeId = request.LeaveTypeId,
            FromDate = request.FromDate.Date,
            ToDate = request.ToDate.Date,
            Reason = request.Reason,
            Status = RequestStatus.Pending
        };

        _context.LeaveRequests.Add(leave);
        await _context.SaveChangesAsync();

        // Send email notification to Admin & Manager
        await SendNewLeaveRequestNotificationAsync(leave);

        return (await GetByIdAsync(leave.Id))!;
    }

    private async Task SendNewLeaveRequestNotificationAsync(LeaveRequest leave)
    {
        try
        {
            var emp = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.ReportingPerson)
                .FirstOrDefaultAsync(e => e.Id == leave.EmployeeId);

            var leaveType = await _context.LeaveTypes.FindAsync(leave.LeaveTypeId);

            if (emp == null || leaveType == null) return;

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

            var subject = $"RIMS — New Leave Request Received from {emp.Name} ({emp.EmployeeCode})";
            var body = $@"
            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;"">
                <div style=""background: #2563eb; color: #ffffff; padding: 20px; text-align: center;"">
                    <h2 style=""margin: 0;"">New Leave Request Received</h2>
                    <p style=""margin: 5px 0 0 0; font-size: 14px;"">Action Required in Approval Queue</p>
                </div>
                <div style=""padding: 25px; color: #1e293b;"">
                    <p style=""font-size: 16px;"">A new leave request has been submitted by <strong>{emp.Name}</strong> ({emp.EmployeeCode}).</p>

                    <div style=""background: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;"">
                        <p style=""margin: 0 0 8px 0;""><strong>Employee:</strong> {emp.Name} ({emp.EmployeeCode})</p>
                        <p style=""margin: 0 0 8px 0;""><strong>Department:</strong> {emp.Department?.Name ?? "N/A"}</p>
                        <p style=""margin: 0 0 8px 0;""><strong>Leave Type:</strong> <span style=""color: #2563eb; font-weight: bold;"">{leaveType.Name}</span></p>
                        <p style=""margin: 0 0 8px 0;""><strong>Leave Period:</strong> {leave.FromDate:yyyy-MM-dd} to {leave.ToDate:yyyy-MM-dd}</p>
                        <p style=""margin: 0;""><strong>Reason:</strong> ""{leave.Reason}""</p>
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

    public async Task<List<LeaveRequestDto>> GetEmployeeLeavesAsync(int employeeId)
    {
        var leaves = await _context.LeaveRequests
            .Include(l => l.Employee)
                .ThenInclude(e => e.Department)
            .Include(l => l.LeaveType)
            .Include(l => l.Approver)
            .Where(l => l.EmployeeId == employeeId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        return leaves.Select(MapToDto).ToList();
    }

    public async Task<List<LeaveRequestDto>> GetPendingApprovalsAsync(int currentEmployeeId, bool isAdmin)
    {
        var query = _context.LeaveRequests
            .Include(l => l.Employee)
                .ThenInclude(e => e.Department)
            .Include(l => l.LeaveType)
            .Include(l => l.Approver)
            .Where(l => l.Status == RequestStatus.Pending)
            .AsQueryable();

        if (!isAdmin)
        {
            // Route to manager's direct reportees
            query = query.Where(l => l.Employee.ReportingPersonId == currentEmployeeId);
        }

        var leaves = await query.OrderBy(l => l.CreatedAt).ToListAsync();
        return leaves.Select(MapToDto).ToList();
    }

    public async Task ApproveLeaveAsync(int leaveRequestId, int approverEmployeeId)
    {
        var leave = await _context.LeaveRequests
            .Include(l => l.Employee)
            .Include(l => l.LeaveType)
            .FirstOrDefaultAsync(l => l.Id == leaveRequestId);

        if (leave == null)
            throw new KeyNotFoundException("Leave request not found.");

        leave.Status = RequestStatus.Approved;
        leave.ApprovedBy = approverEmployeeId;
        leave.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Send email notification
        try
        {
            await _emailService.SendEmailAsync(
                leave.Employee.Email,
                "RIMS - Leave Request Approved",
                $"Hello {leave.Employee.Name},\n\nYour {leave.LeaveType.Name} request from {leave.FromDate:yyyy-MM-dd} to {leave.ToDate:yyyy-MM-dd} has been APPROVED.\n\nRegards,\nRIMS Approval Engine");
        }
        catch
        {
        }
    }

    public async Task RejectLeaveAsync(int leaveRequestId, int approverEmployeeId)
    {
        var leave = await _context.LeaveRequests
            .Include(l => l.Employee)
            .Include(l => l.LeaveType)
            .FirstOrDefaultAsync(l => l.Id == leaveRequestId);

        if (leave == null)
            throw new KeyNotFoundException("Leave request not found.");

        leave.Status = RequestStatus.Rejected;
        leave.ApprovedBy = approverEmployeeId;
        leave.ApprovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Send email notification
        try
        {
            await _emailService.SendEmailAsync(
                leave.Employee.Email,
                "RIMS - Leave Request Rejected",
                $"Hello {leave.Employee.Name},\n\nYour {leave.LeaveType.Name} request from {leave.FromDate:yyyy-MM-dd} to {leave.ToDate:yyyy-MM-dd} has been REJECTED.\n\nRegards,\nRIMS Approval Engine");
        }
        catch
        {
        }
    }

    private async Task<LeaveRequestDto?> GetByIdAsync(int id)
    {
        var l = await _context.LeaveRequests
            .Include(req => req.Employee)
                .ThenInclude(e => e.Department)
            .Include(req => req.LeaveType)
            .Include(req => req.Approver)
            .FirstOrDefaultAsync(req => req.Id == id);

        return l != null ? MapToDto(l) : null;
    }

    public async Task<decimal> CalculateLeaveDaysAsync(DateTime fromDate, DateTime toDate, int employeeId)
    {
        var calendars = await _context.AttendanceCalendars
            .Where(c => c.CalendarDate >= DateOnly.FromDateTime(fromDate) && c.CalendarDate <= DateOnly.FromDateTime(toDate))
            .ToDictionaryAsync(c => c.CalendarDate);

        decimal count = 0;
        for (var d = fromDate.Date; d <= toDate.Date; d = d.AddDays(1))
        {
            var dateOnly = DateOnly.FromDateTime(d);
            if (calendars.TryGetValue(dateOnly, out var cal))
            {
                if (cal.DayType == AttendanceDayType.WorkingDay || cal.DayType == AttendanceDayType.SpecialWorkingDay)
                {
                    count += 1;
                }
                else if (cal.DayType == AttendanceDayType.OptionalHoliday)
                {
                    var isApprovedOptional = await _context.LeaveRequests
                        .Include(l => l.LeaveType)
                        .AnyAsync(l => l.EmployeeId == employeeId &&
                                      l.Status == RequestStatus.Approved &&
                                      l.LeaveType.Name.Contains("Optional") &&
                                      l.FromDate.Date <= d &&
                                      l.ToDate.Date >= d);
                    if (!isApprovedOptional) count += 1;
                }
            }
            else
            {
                if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
                {
                    count += 1;
                }
            }
        }
        return count;
    }

    private LeaveRequestDto MapToDto(LeaveRequest l)
    {
        // Calculate leave duration excluding weekends and holidays
        decimal days = 0;
        for (var d = l.FromDate.Date; d <= l.ToDate.Date; d = d.AddDays(1))
        {
            var cal = _context.AttendanceCalendars.FirstOrDefault(c => c.CalendarDate == DateOnly.FromDateTime(d));
            if (cal != null)
            {
                if (cal.DayType == AttendanceDayType.WorkingDay || cal.DayType == AttendanceDayType.SpecialWorkingDay)
                {
                    days += 1;
                }
            }
            else
            {
                if (d.DayOfWeek != DayOfWeek.Saturday && d.DayOfWeek != DayOfWeek.Sunday)
                {
                    days += 1;
                }
            }
        }

        return new LeaveRequestDto
        {
            Id = l.Id,
            EmployeeId = l.EmployeeId,
            EmployeeName = l.Employee.Name,
            EmployeeCode = l.Employee.EmployeeCode,
            DepartmentName = l.Employee.Department?.Name ?? string.Empty,
            LeaveTypeId = l.LeaveTypeId,
            LeaveTypeName = l.LeaveType.Name,
            FromDate = l.FromDate,
            ToDate = l.ToDate,
            LeaveDays = days,
            Reason = l.Reason,
            Status = l.Status.ToString(),
            ApprovedBy = l.ApprovedBy,
            ApproverName = l.Approver?.Name,
            ApprovedAt = l.ApprovedAt,
            CreatedAt = l.CreatedAt
        };
    }
}
