using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class AttendanceCalendarService : IAttendanceCalendarService
{
    private readonly RiimsDbContext _context;
    private readonly ISystemSettingService _settingService;

    public AttendanceCalendarService(RiimsDbContext context, ISystemSettingService settingService)
    {
        _context = context;
        _settingService = settingService;
    }

    private static readonly TimeZoneInfo IstTimeZone = GetIstTimeZone();

    private static TimeZoneInfo GetIstTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Indian Standard Time");
        }
        catch
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        }
    }

    public async Task<List<AttendanceCalendarDto>> GetMonthlyCalendarAsync(int year, int month)
    {
        var entries = await _context.AttendanceCalendars
            .Where(c => c.Year == year && c.Month == month)
            .OrderBy(c => c.CalendarDate)
            .ToListAsync();

        return entries.Select(MapToDto).ToList();
    }

    public async Task<List<AttendanceCalendarDto>> GenerateMonthlyCalendarAsync(int year, int month)
    {
        var existingEntries = await _context.AttendanceCalendars
            .Where(c => c.Year == year && c.Month == month)
            .ToListAsync();

        if (existingEntries.Any(e => e.IsPublished))
        {
            throw new InvalidOperationException($"Monthly calendar for {month}/{year} is already published and cannot be regenerated.");
        }

        if (existingEntries.Any())
        {
            _context.AttendanceCalendars.RemoveRange(existingEntries);
            await _context.SaveChangesAsync();
        }

        int daysInMonth = DateTime.DaysInMonth(year, month);
        var newEntries = new List<AttendanceCalendar>();

        for (int day = 1; day <= daysInMonth; day++)
        {
            var date = new DateOnly(year, month, day);
            DayOfWeek dayOfWeek = date.DayOfWeek;

            bool isWeekend = dayOfWeek == DayOfWeek.Saturday || dayOfWeek == DayOfWeek.Sunday;
            AttendanceDayType dayType = isWeekend ? AttendanceDayType.Weekend : AttendanceDayType.WorkingDay;

            var calendar = new AttendanceCalendar
            {
                CalendarDate = date,
                Year = year,
                Month = month,
                DayType = dayType,
                IsWorkingDay = !isWeekend,
                IsHoliday = false,
                HolidayName = null,
                Description = null,
                IsPublished = false
            };

            newEntries.Add(calendar);
        }

        _context.AttendanceCalendars.AddRange(newEntries);
        await _context.SaveChangesAsync();

        return newEntries.OrderBy(c => c.CalendarDate).Select(MapToDto).ToList();
    }

    public async Task<AttendanceCalendarDto> UpdateCalendarDayAsync(int id, UpdateCalendarDayRequestDto dto, int userId)
    {
        var calendar = await _context.AttendanceCalendars.FirstOrDefaultAsync(c => c.Id == id);
        if (calendar == null)
        {
            throw new KeyNotFoundException($"Attendance calendar record with ID {id} not found.");
        }

        if (calendar.IsPublished && string.IsNullOrWhiteSpace(dto.ReasonForChange))
        {
            throw new ArgumentException("Reason for change is mandatory when modifying a published calendar entry.");
        }

        var oldDayType = calendar.DayType;
        var oldHolidayName = calendar.HolidayName;

        calendar.DayType = dto.DayType;
        calendar.HolidayName = string.IsNullOrWhiteSpace(dto.HolidayName) ? null : dto.HolidayName.Trim();
        calendar.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        calendar.LastModifiedBy = userId;
        calendar.LastModifiedAt = DateTime.UtcNow;

        // Recalculate working day and holiday indicators
        calendar.IsWorkingDay = calendar.DayType == AttendanceDayType.WorkingDay || calendar.DayType == AttendanceDayType.SpecialWorkingDay;
        calendar.IsHoliday = calendar.DayType == AttendanceDayType.CompanyHoliday || calendar.DayType == AttendanceDayType.OptionalHoliday;

        // Audit tracking if published or day type / holiday changed
        if (calendar.IsPublished || oldDayType != calendar.DayType || oldHolidayName != calendar.HolidayName)
        {
            var audit = new AttendanceCalendarAudit
            {
                AttendanceCalendarId = calendar.Id,
                CalendarDate = calendar.CalendarDate,
                OldDayType = oldDayType,
                NewDayType = calendar.DayType,
                OldHolidayName = oldHolidayName,
                NewHolidayName = calendar.HolidayName,
                ChangedByUserId = userId,
                ChangedAt = DateTime.UtcNow,
                ReasonForChange = string.IsNullOrWhiteSpace(dto.ReasonForChange) ? "Calendar entry updated" : dto.ReasonForChange.Trim()
            };

            _context.AttendanceCalendarAudits.Add(audit);
        }

        await _context.SaveChangesAsync();
        return MapToDto(calendar);
    }

    public async Task<MonthCalendarStatusDto> PublishMonthlyCalendarAsync(int year, int month, int userId)
    {
        var entries = await _context.AttendanceCalendars
            .Where(c => c.Year == year && c.Month == month)
            .ToListAsync();

        int expectedDays = DateTime.DaysInMonth(year, month);
        if (entries.Count < expectedDays)
        {
            throw new InvalidOperationException($"Cannot publish incomplete calendar. Expected {expectedDays} days but found {entries.Count}. Please generate calendar first.");
        }

        var now = DateTime.UtcNow;
        foreach (var entry in entries)
        {
            entry.IsPublished = true;
            entry.PublishedBy = userId;
            entry.PublishedAt = now;
        }

        await _context.SaveChangesAsync();
        return await GetCalendarStatusAsync(year, month);
    }

    public async Task<MonthCalendarStatusDto> GetCalendarStatusAsync(int year, int month)
    {
        var entries = await _context.AttendanceCalendars
            .Where(c => c.Year == year && c.Month == month)
            .ToListAsync();

        if (!entries.Any())
        {
            return new MonthCalendarStatusDto
            {
                Year = year,
                Month = month,
                Status = "NotGenerated",
                IsGenerated = false,
                IsPublished = false,
                TotalDays = DateTime.DaysInMonth(year, month)
            };
        }

        bool isPublished = entries.All(e => e.IsPublished);
        int? publishedBy = entries.FirstOrDefault(e => e.PublishedBy.HasValue)?.PublishedBy;
        DateTime? publishedAt = entries.FirstOrDefault(e => e.PublishedAt.HasValue)?.PublishedAt;

        string? publisherName = null;
        if (publishedBy.HasValue)
        {
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == publishedBy.Value);
            if (emp != null)
            {
                publisherName = emp.Name;
            }
        }

        return new MonthCalendarStatusDto
        {
            Year = year,
            Month = month,
            Status = isPublished ? "Published" : "Draft",
            IsGenerated = true,
            IsPublished = isPublished,
            TotalDays = entries.Count,
            WorkingDays = entries.Count(e => e.DayType == AttendanceDayType.WorkingDay),
            WeekendDays = entries.Count(e => e.DayType == AttendanceDayType.Weekend),
            CompanyHolidays = entries.Count(e => e.DayType == AttendanceDayType.CompanyHoliday),
            OptionalHolidays = entries.Count(e => e.DayType == AttendanceDayType.OptionalHoliday),
            SpecialWorkingDays = entries.Count(e => e.DayType == AttendanceDayType.SpecialWorkingDay),
            PublishedBy = publishedBy,
            PublishedByName = publisherName,
            PublishedAt = publishedAt
        };
    }

    public async Task<List<AttendanceCalendarAuditDto>> GetCalendarAuditLogsAsync(int calendarId)
    {
        var audits = await _context.AttendanceCalendarAudits
            .Where(a => a.AttendanceCalendarId == calendarId)
            .OrderByDescending(a => a.ChangedAt)
            .ToListAsync();

        var userIds = audits.Select(a => a.ChangedByUserId).Distinct().ToList();
        var employees = await _context.Employees
            .Where(e => userIds.Contains(e.Id))
            .ToDictionaryAsync(e => e.Id, e => e.Name);

        return audits.Select(a => new AttendanceCalendarAuditDto
        {
            Id = a.Id,
            AttendanceCalendarId = a.AttendanceCalendarId,
            CalendarDate = a.CalendarDate,
            OldDayType = a.OldDayType,
            NewDayType = a.NewDayType,
            OldHolidayName = a.OldHolidayName,
            NewHolidayName = a.NewHolidayName,
            ChangedByUserId = a.ChangedByUserId,
            ChangedByUserName = employees.TryGetValue(a.ChangedByUserId, out var name) ? name : $"User #{a.ChangedByUserId}",
            ChangedAt = a.ChangedAt,
            ReasonForChange = a.ReasonForChange
        }).ToList();
    }

    public async Task<AttendanceCalendarDto?> GetDayCalendarAsync(DateOnly date)
    {
        var entry = await _context.AttendanceCalendars.FirstOrDefaultAsync(c => c.CalendarDate == date);
        return entry == null ? null : MapToDto(entry);
    }

    public async Task<bool> IsWorkingDayForEmployeeAsync(DateOnly date, int employeeId)
    {
        var entry = await _context.AttendanceCalendars.FirstOrDefaultAsync(c => c.CalendarDate == date);

        if (entry == null)
        {
            DayOfWeek dow = date.ToDateTime(TimeOnly.MinValue).DayOfWeek;
            return dow != DayOfWeek.Saturday && dow != DayOfWeek.Sunday;
        }

        switch (entry.DayType)
        {
            case AttendanceDayType.WorkingDay:
            case AttendanceDayType.SpecialWorkingDay:
                return true;

            case AttendanceDayType.Weekend:
            case AttendanceDayType.CompanyHoliday:
                return false;

            case AttendanceDayType.OptionalHoliday:
                DateTime checkDateTime = date.ToDateTime(TimeOnly.MinValue);
                bool hasApprovedOptionalHoliday = await _context.LeaveRequests
                    .Include(l => l.LeaveType)
                    .AnyAsync(l => l.EmployeeId == employeeId &&
                                  l.Status == RequestStatus.Approved &&
                                  l.LeaveType.Name.Contains("Optional") &&
                                  l.FromDate.Date <= checkDateTime.Date &&
                                  l.ToDate.Date >= checkDateTime.Date);

                return !hasApprovedOptionalHoliday;

            default:
                return entry.IsWorkingDay;
        }
    }

    public async Task<List<EmployeeDailyAttendanceSummaryDto>> GetEmployeeMonthlyAttendanceAsync(int employeeId, int year, int month)
    {
        var report = await GetEmployeeMonthlyAttendanceReportAsync(employeeId, year, month);
        return report.DailySummaries;
    }

    public async Task<EmployeeMonthlyAttendanceReportDto> GetEmployeeMonthlyAttendanceReportAsync(int employeeId, int year, int month)
    {
        var calendarEntries = await GetMonthlyCalendarAsync(year, month);
        int daysInMonth = DateTime.DaysInMonth(year, month);

        DateTime startDateUtc = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        DateTime endDateUtc = startDateUtc.AddMonths(1).AddDays(1);

        var logs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= startDateUtc && a.LoginTime < endDateUtc)
            .ToListAsync();

        var approvedLeaves = await _context.LeaveRequests
            .Include(l => l.LeaveType)
            .Where(l => l.EmployeeId == employeeId &&
                        l.Status == RequestStatus.Approved &&
                        l.FromDate <= endDateUtc &&
                        l.ToDate >= startDateUtc)
            .ToListAsync();

        var settings = await _settingService.GetTypedSettingsAsync();

        var payslipMonthStart = new DateTime(year, month, 1);
        var payslipMonthEnd = new DateTime(year, month, daysInMonth);

        var activeSalaryStructure = await _context.EmployeeSalaryStructures
            .Where(s => s.EmployeeId == employeeId && s.EffectiveFrom <= payslipMonthEnd && (s.EffectiveTo == null || s.EffectiveTo >= payslipMonthStart))
            .OrderByDescending(s => s.EffectiveFrom)
            .FirstOrDefaultAsync();

        if (activeSalaryStructure == null)
        {
            activeSalaryStructure = await _context.EmployeeSalaryStructures
                .Where(s => s.EmployeeId == employeeId && s.IsActive)
                .OrderByDescending(s => s.EffectiveFrom)
                .FirstOrDefaultAsync();
        }

        decimal monthlySalary = activeSalaryStructure?.MonthlyCTC ?? 0m;

        var approvedPermissions = await _context.PermissionRequests
            .AsNoTracking()
            .Where(p => p.EmployeeId == employeeId && p.Status == RequestStatus.Approved && p.RequestDate >= startDateUtc && p.RequestDate <= endDateUtc)
            .ToListAsync();

        var lopResult = LeaveLopCalculator.Calculate(
            employeeId,
            year,
            month,
            settings.MonthlyAllowedLeave,
            settings.LateLoginsForHalfDay,
            monthlySalary,
            calendarEntries,
            approvedLeaves,
            logs,
            approvedPermissions,
            settings);

        var dailySummaries = lopResult.DailyDetails.Select(d => new EmployeeDailyAttendanceSummaryDto
        {
            Date = d.Date,
            DayType = d.DayType,
            IsWorkingDay = d.IsWorkingDay,
            HolidayName = d.HolidayName,
            Status = d.Status,
            LoginTime = d.LoginTime,
            LogoutTime = d.LogoutTime,
            IsLate = d.IsLate,
            IsPermission = d.IsPermission,
            PermissionHours = d.IsPermission ? settings.PermissionHours : 0m,
            IsLeave = d.IsLeave,
            IsSandwichLeave = d.IsSandwichLeave,
            IsLop = d.IsLop,
            LopReason = d.LopReason,
            LeaveReason = d.LeaveReason
        }).ToList();

        return new EmployeeMonthlyAttendanceReportDto
        {
            EmployeeId = employeeId,
            Year = year,
            Month = month,
            TotalCalendarDays = lopResult.TotalCalendarDays,
            WorkingDays = lopResult.WorkingDays,
            PresentDays = lopResult.PresentDays,
            ApprovedLeaveDays = lopResult.ApprovedLeaveDays,
            WeekendDays = lopResult.WeekendDays,
            HolidayDays = lopResult.HolidayDays,
            MonthlyAllowedLeave = lopResult.MonthlyAllowedLeave,
            ActualLeaveDays = lopResult.ActualLeaveDays,
            SandwichLeaveDays = lopResult.SandwichLeaveDays,
            TotalLeaveLOPDays = lopResult.TotalLeaveLOPDays,
            LeaveLOPDays = lopResult.LeaveLOPDays,
            UnpermissionedLateCount = lopResult.UnpermissionedLateCount,
            LateLoginLOPDays = lopResult.LateLoginLOPDays,
            TotalLOPDays = lopResult.TotalLOPDays,
            DailySalary = lopResult.DailySalary,
            TotalLOPAmount = lopResult.TotalLOPAmount,
            DailySummaries = dailySummaries
        };
    }

    private static AttendanceCalendarDto MapToDto(AttendanceCalendar c)
    {
        return new AttendanceCalendarDto
        {
            Id = c.Id,
            CalendarDate = c.CalendarDate,
            Year = c.Year,
            Month = c.Month,
            DayType = c.DayType,
            IsWorkingDay = c.IsWorkingDay,
            IsHoliday = c.IsHoliday,
            HolidayName = c.HolidayName,
            Description = c.Description,
            IsPublished = c.IsPublished,
            PublishedBy = c.PublishedBy,
            PublishedAt = c.PublishedAt,
            LastModifiedBy = c.LastModifiedBy,
            LastModifiedAt = c.LastModifiedAt
        };
    }
}
