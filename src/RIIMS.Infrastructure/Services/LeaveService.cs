using System.Net;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Leave;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using Microsoft.Extensions.Configuration;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class LeaveService : ILeaveService
{
    private readonly RiimsDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration? _configuration;

    public LeaveService(RiimsDbContext context, IEmailService emailService, IConfiguration? configuration = null)
    {
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
    }

    public async Task<LeaveRequestDto> SubmitLeaveAsync(int employeeId, CreateLeaveRequest request)
    {
        var fromDate = request.FromDate.Date;
        var toDate = request.ToDate.Date;

        // Overlap validation
        var existingActiveLeaves = await _context.LeaveRequests
            .Where(l => l.EmployeeId == employeeId &&
                        l.Status != RequestStatus.Rejected &&
                        l.FromDate.Date <= toDate &&
                        l.ToDate.Date >= fromDate)
            .ToListAsync();

        foreach (var existing in existingActiveLeaves)
        {
            if (existing.LeaveDuration == LeaveDuration.FullDay || request.LeaveDuration == LeaveDuration.FullDay)
            {
                throw new InvalidOperationException($"An active leave request already exists for the requested period.");
            }
            if (existing.LeaveDuration == LeaveDuration.HalfDay && request.LeaveDuration == LeaveDuration.HalfDay)
            {
                if (existing.HalfDayType == request.HalfDayType)
                {
                    throw new InvalidOperationException($"An active {request.HalfDayType} leave request already exists for {fromDate:yyyy-MM-dd}.");
                }
            }
        }

        var leave = new LeaveRequest
        {
            EmployeeId = employeeId,
            LeaveTypeId = request.LeaveTypeId,
            FromDate = fromDate,
            ToDate = toDate,
            LeaveDuration = request.LeaveDuration,
            HalfDayType = request.LeaveDuration == LeaveDuration.HalfDay ? request.HalfDayType : null,
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

            var adminRoles = await _context.Roles
                .Where(r => r.Name == "Admin" || r.Name == "Super Admin")
                .Select(r => r.Id)
                .ToListAsync();

            var adminEmails = new List<string>();
            if (adminRoles.Any())
            {
                var adminUserIds = await _context.UserRoles
                    .Where(ur => adminRoles.Contains(ur.RoleId))
                    .Select(ur => ur.UserId)
                    .ToListAsync();

                adminEmails = await _context.Users
                    .Where(u => adminUserIds.Contains(u.Id) && u.IsActive && !string.IsNullOrEmpty(u.Email))
                    .Select(u => u.Email!)
                    .ToListAsync();
            }

            // Remove any local dummy domains
            adminEmails = adminEmails
                .Where(e => !e.EndsWith("@riims.local", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var defaultAdminEmail = _configuration?["AdminEmail"] ?? "anitha@reshandthosh.com";
            if (!string.IsNullOrWhiteSpace(defaultAdminEmail) && !adminEmails.Contains(defaultAdminEmail, StringComparer.OrdinalIgnoreCase))
            {
                adminEmails.Add(defaultAdminEmail);
            }

            if (emp.ReportingPerson != null && !string.IsNullOrEmpty(emp.ReportingPerson.Email) && !adminEmails.Contains(emp.ReportingPerson.Email, StringComparer.OrdinalIgnoreCase))
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
                        <a href=""{(_configuration?["AppUrl"] ?? "http://10.60.121.234:99").TrimEnd('/')}/admin/approvals"" style=""background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;"">Review & Approve Request</a>
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
        await SendLeaveStatusNotificationAsync(leave, isApproved: true);
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
        await SendLeaveStatusNotificationAsync(leave, isApproved: false);
    }

    private async Task<string> FormatLeaveDurationAsync(LeaveRequest leave)
    {
        if (leave.LeaveDuration == LeaveDuration.HalfDay)
        {
            var halfType = leave.HalfDayType == HalfDayType.SecondHalf ? "Second Half" : "First Half";
            return $"0.5 Day ({halfType})";
        }

        var days = await CalculateLeaveDaysAsync(leave.FromDate, leave.ToDate, leave.EmployeeId);
        if (days <= 0)
        {
            days = (leave.ToDate.Date - leave.FromDate.Date).Days + 1;
        }

        return $"{days} {(days == 1 ? "Day" : "Days")}";
    }

    private async Task SendLeaveStatusNotificationAsync(LeaveRequest leave, bool isApproved)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(leave.Employee?.Email))
                return;

            var employeeName = WebUtility.HtmlEncode(leave.Employee.Name ?? "Employee");
            var leaveTypeName = WebUtility.HtmlEncode(leave.LeaveType?.Name ?? "Leave");
            var fromDateStr = leave.FromDate.ToString("yyyy-MM-dd");
            var toDateStr = leave.ToDate.ToString("yyyy-MM-dd");
            var durationText = await FormatLeaveDurationAsync(leave);
            var reasonText = !string.IsNullOrWhiteSpace(leave.Reason) ? WebUtility.HtmlEncode(leave.Reason) : "Not specified";

            var statusText = isApproved ? "APPROVED" : "REJECTED";
            var subject = isApproved
                ? $"✅ Leave Request Approved — {leaveTypeName}"
                : $"❌ Leave Request Rejected — {leaveTypeName}";

            var headerGradient = isApproved
                ? "background: #16a34a; background-image: linear-gradient(135deg, #10b981 0%, #059669 100%);"
                : "background: #dc2626; background-image: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);";

            var statusBadge = isApproved
                ? @"<span style=""display: inline-block; padding: 4px 14px; font-size: 12px; font-weight: 700; color: #15803d; background-color: #dcfce7; border: 1px solid #86efac; border-radius: 9999px; letter-spacing: 0.5px;"">APPROVED</span>"
                : @"<span style=""display: inline-block; padding: 4px 14px; font-size: 12px; font-weight: 700; color: #b91c1c; background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 9999px; letter-spacing: 0.5px;"">REJECTED</span>";

            var introMessage = isApproved
                ? @"Your leave request has been <strong style=""color: #15803d;"">APPROVED</strong>. Below is the approved schedule:"
                : @"Your leave request has been <strong style=""color: #b91c1c;"">REJECTED</strong>. Below is the summary of your request:";

            var closingNote = isApproved
                ? @"<div style=""background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 6px; padding: 14px 16px; margin: 20px 0 24px 0;"">
                    <p style=""margin: 0; font-size: 13px; color: #166534; line-height: 1.5;"">
                        <strong>📌 Next Steps:</strong> Please ensure that your pending responsibilities are handed over and inform your team about your planned absence.
                    </p>
                   </div>"
                : @"<div style=""background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 14px 16px; margin: 20px 0 24px 0;"">
                    <p style=""margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;"">
                        <strong>📌 Next Steps:</strong> If you have questions or require further clarification regarding this decision, please contact your reporting manager or the HR department.
                    </p>
                   </div>";

            var reasonRow = !isApproved
                ? $@"<tr>
                        <td style=""padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; width: 120px; border-top: 1px solid #e2e8f0; vertical-align: top;"">Reason</td>
                        <td style=""padding: 11px 16px; color: #334155; font-size: 13px; font-style: italic; border-top: 1px solid #e2e8f0;"">{reasonText}</td>
                    </tr>"
                : string.Empty;

            var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{subject}</title>
</head>
<body style=""margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1e293b;"">
    <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #f8fafc; padding: 32px 16px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);"">
                    <!-- Header -->
                    <tr>
                        <td style=""{headerGradient} padding: 24px 30px; text-align: center; color: #ffffff;"">
                            <h1 style=""margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.2px;"">
                                Leave Request {statusText}
                            </h1>
                            <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">
                                RIMS Leave Management System
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style=""padding: 28px 30px;"">
                            <p style=""margin: 0 0 12px 0; font-size: 15px; color: #1e293b; font-weight: 600;"">
                                Hello {employeeName},
                            </p>
                            <p style=""margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.5;"">
                                {introMessage}
                            </p>

                            <!-- Structured Summary Block -->
                            <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; border-collapse: collapse; margin-bottom: 20px;"">
                                <tr>
                                    <td style=""padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; width: 120px;"">Leave Type</td>
                                    <td style=""padding: 11px 16px; color: #1e293b; font-size: 13px; font-weight: 600;"">{leaveTypeName}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">From</td>
                                    <td style=""padding: 11px 16px; color: #1e293b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">{fromDateStr}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">To</td>
                                    <td style=""padding: 11px 16px; color: #1e293b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">{toDateStr}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">Duration</td>
                                    <td style=""padding: 11px 16px; color: #1e293b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">{durationText}</td>
                                </tr>
                                <tr>
                                    <td style=""padding: 11px 16px; color: #64748b; font-size: 13px; font-weight: 600; border-top: 1px solid #e2e8f0;"">Status</td>
                                    <td style=""padding: 11px 16px; border-top: 1px solid #e2e8f0;"">{statusBadge}</td>
                                </tr>
                                {reasonRow}
                            </table>

                            <!-- Closing Note -->
                            {closingNote}

                            <!-- Sign-off -->
                            <div style=""margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #475569;"">
                                <p style=""margin: 0 0 4px 0;"">Regards,</p>
                                <p style=""margin: 0; font-weight: 700; color: #1e293b; font-size: 14px;"">RIMS Approval Engine</p>
                                <p style=""margin: 2px 0 0 0; font-size: 12px; color: #94a3b8;"">Resource &amp; Information Management System</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style=""background-color: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;"">
                            This is an automated notification from RIMS. Please do not reply directly to this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";

            await _emailService.SendEmailAsync(leave.Employee.Email, subject, htmlBody);
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
        decimal days = 0;
        if (l.LeaveDuration == LeaveDuration.HalfDay)
        {
            days = 0.5m;
        }
        else
        {
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
            LeaveDuration = l.LeaveDuration,
            HalfDayType = l.HalfDayType,
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
