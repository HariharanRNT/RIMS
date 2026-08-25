using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using RIIMS.Application.DTOs.Report;
using RIIMS.Application.DTOs.Timeline;
using RIIMS.Application.DTOs.AttendanceCalendar;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly RiimsDbContext _context;
    private readonly ITaskService _taskService;
    private readonly ISystemSettingService _settingService;

    public ReportService(RiimsDbContext context, ITaskService taskService, ISystemSettingService settingService)
    {
        _context = context;
        _taskService = taskService;
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

    private static (DateTime startUtc, DateTime endUtc) GetTodayIstUtcRange()
    {
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);
        var todayIstStart = nowIst.Date;
        var tomorrowIstStart = todayIstStart.AddDays(1);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(todayIstStart, IstTimeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(tomorrowIstStart, IstTimeZone);

        return (startUtc, endUtc);
    }

    private DateTime GetEffectiveEndTime(DateTime startTime, DateTime? endTime, RIIMS.Application.DTOs.Settings.TypedSystemSettingsDto? settings = null)
    {
        if (endTime.HasValue) return endTime.Value;

        var startIst = TimeZoneInfo.ConvertTimeFromUtc(startTime, IstTimeZone);
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);

        if (startIst.Date < nowIst.Date)
        {
            var officeEndTs = settings?.OfficeEndTime ?? new TimeSpan(19, 0, 0);
            var officeEndIst = startIst.Date.Add(officeEndTs);
            var officeEndUtc = TimeZoneInfo.ConvertTimeToUtc(officeEndIst, IstTimeZone);
            return officeEndUtc > startTime ? officeEndUtc : startTime;
        }

        return DateTime.UtcNow;
    }

    public async Task<AdminDashboardMetricsDto> GetAdminDashboardMetricsAsync()
    {
        var (today, nextDay) = GetTodayIstUtcRange();

        var totalEmployees = await _context.Employees.CountAsync(e => e.IsActive);

        var todayAttendanceEmployeeIds = await _context.AttendanceLogs
            .Where(a => a.LoginTime >= today && a.LoginTime < nextDay)
            .Select(a => a.EmployeeId)
            .Distinct()
            .ToListAsync();

        var activeWorkforceCount = todayAttendanceEmployeeIds.Count;

        var workingCount = await _context.WorkTasks
            .Where(t => t.Status == TaskStatusEnum.Running)
            .Select(t => t.EmployeeId)
            .Distinct()
            .CountAsync();

        var onBreakCount = await _context.BreakLogs
            .Where(b => b.EndTime == null)
            .Select(b => b.EmployeeId)
            .Distinct()
            .CountAsync();

        var inSupportCount = await _context.SupportActivityLogs
            .Where(s => s.EndTime == null)
            .Select(s => s.EmployeeId)
            .Distinct()
            .CountAsync();

        var offlineCount = Math.Max(0, totalEmployees - activeWorkforceCount);

        // Today Productive Hours (Tasks + Support)
        var todayTaskLogsAdmin = await _context.TaskTimeLogs
            .Where(t => t.StartTime >= today && t.StartTime < nextDay)
            .ToListAsync();
        var todayTaskSeconds = todayTaskLogsAdmin
            .Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

        var todaySupportLogsAdmin = await _context.SupportActivityLogs
            .Where(s => s.StartTime >= today && s.StartTime < nextDay)
            .ToListAsync();
        var todaySupportSeconds = todaySupportLogsAdmin
            .Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

        var todayProductiveHours = Math.Round((todayTaskSeconds + todaySupportSeconds) / 3600.0, 2);

        var todayGraceViolations = await _context.GraceTimeViolations
            .CountAsync(g => g.Date >= today && g.Date < nextDay);

        // Recent timeline activities
        var recentTimeline = await _context.ActivityTimelines
            .OrderByDescending(a => a.StartTime)
            .Take(10)
            .ToListAsync();

        var recentDtos = recentTimeline.Select(a => new ActivityTimelineDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            ActivityType = a.ActivityType,
            RefTable = a.RefTable,
            RefId = a.RefId,
            StartTime = a.StartTime,
            EndTime = a.EndTime,
            Status = a.Status,
            Remarks = a.Remarks,
            Duration = a.EndTime.HasValue ? (a.EndTime.Value - a.StartTime).ToString(@"hh\:mm\:ss") : null
        }).ToList();

        return new AdminDashboardMetricsDto
        {
            TotalEmployees = totalEmployees,
            ActiveWorkforceCount = activeWorkforceCount,
            WorkingCount = workingCount,
            OnBreakCount = onBreakCount,
            InSupportCount = inSupportCount,
            OfflineCount = offlineCount,
            TodayProductiveHours = todayProductiveHours,
            TodayGraceViolations = todayGraceViolations,
            RecentActivities = recentDtos
        };
    }

    public async Task<EmployeeDashboardMetricsDto> GetEmployeeDashboardMetricsAsync(int employeeId)
    {
        var (today, nextDay) = GetTodayIstUtcRange();

        var emp = await _context.Employees.FindAsync(employeeId);
        if (emp == null)
        {
            return new EmployeeDashboardMetricsDto
            {
                EmployeeId = employeeId,
                EmployeeName = "Employee",
                TodayProductiveHours = 0,
                TodayBreakHours = 0,
                TodayActivities = new List<ActivityTimelineDto>()
            };
        }

        var todayAttendance = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= today && a.LoginTime < nextDay)
            .OrderBy(a => a.LoginTime)
            .FirstOrDefaultAsync();

        var todayTaskLogs = await _context.TaskTimeLogs
            .Where(t => t.Task.EmployeeId == employeeId && t.StartTime >= today && t.StartTime < nextDay)
            .ToListAsync();
        var empTaskSeconds = todayTaskLogs
            .Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

        var todaySupportLogs = await _context.SupportActivityLogs
            .Where(s => s.EmployeeId == employeeId && s.StartTime >= today && s.StartTime < nextDay)
            .ToListAsync();
        var empSupportSeconds = todaySupportLogs
            .Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

        var todayBreakLogs = await _context.BreakLogs
            .Where(b => b.EmployeeId == employeeId && b.StartTime >= today && b.StartTime < nextDay)
            .ToListAsync();
        var empBreakSeconds = todayBreakLogs
            .Sum(b => ((b.EndTime ?? DateTime.UtcNow) - b.StartTime).TotalSeconds);

        var todayIdleLogs = await _context.IdleTimeLogs
            .Where(i => i.EmployeeId == employeeId && i.StartTime >= today && i.StartTime < nextDay)
            .ToListAsync();
        var rawIdleSeconds = todayIdleLogs.Sum(i => ((i.EndTime ?? DateTime.UtcNow) - i.StartTime).TotalSeconds);

        var todayAttendanceSessions = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= today && a.LoginTime < nextDay)
            .ToListAsync();

        double totalSessionSec = 0;
        var nowUtc = DateTime.UtcNow;
        foreach (var att in todayAttendanceSessions)
        {
            var sessEnd = att.LogoutTime ?? nowUtc;
            if (sessEnd > att.LoginTime)
            {
                totalSessionSec += (sessEnd - att.LoginTime).TotalSeconds;
            }
        }

        var dynamicIdleSec = Math.Max(0, totalSessionSec - (empTaskSeconds + empSupportSeconds + empBreakSeconds));
        var empIdleSeconds = totalSessionSec > 0 ? dynamicIdleSec : rawIdleSeconds;

        var todayGrace = await _context.GraceTimeViolations
            .FirstOrDefaultAsync(g => g.EmployeeId == employeeId && g.Date >= today && g.Date < nextDay);

        var activeTask = await _taskService.GetActiveTaskAsync(employeeId);

        var todayTimeline = await _context.ActivityTimelines
            .Where(a => a.EmployeeId == employeeId && a.StartTime >= today && a.StartTime < nextDay)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        var todayDtos = todayTimeline.Select(a => new ActivityTimelineDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            ActivityType = a.ActivityType,
            RefTable = a.RefTable,
            RefId = a.RefId,
            StartTime = a.StartTime,
            EndTime = a.EndTime,
            Status = a.Status,
            Remarks = a.Remarks,
            Duration = a.EndTime.HasValue ? (a.EndTime.Value - a.StartTime).ToString(@"hh\:mm\:ss") : null
        }).ToList();

        var todayBreakHours = Math.Round(empBreakSeconds / 3600.0, 2);
        var todayIdleHours = Math.Round(empIdleSeconds / 3600.0, 2);
        var todayNonProductiveHours = Math.Round((empBreakSeconds + empIdleSeconds) / 3600.0, 2);

        bool isHalfDayToday = false;
        string? todayStatus = todayAttendance?.Status;
        if (todayAttendance != null)
        {
            if (todayAttendance.Status == "HalfDay Attendance")
            {
                isHalfDayToday = true;
            }
            else if (!todayAttendance.IsPermission)
            {
                var settings = await _settingService.GetTypedSettingsAsync();
                var loginTimeIst = TimeZoneInfo.ConvertTimeFromUtc(todayAttendance.LoginTime, IstTimeZone);
                var permEnd = settings.OfficeStartTime.Add(TimeSpan.FromHours((double)settings.PermissionHours));
                if (loginTimeIst.TimeOfDay > permEnd)
                {
                    isHalfDayToday = true;
                    todayStatus = "HalfDay Attendance";
                }
            }
        }

        return new EmployeeDashboardMetricsDto
        {
            EmployeeId = employeeId,
            EmployeeName = emp.Name,
            TodayLoginTime = todayAttendance?.LoginTime,
            TodayLogoutTime = todayAttendance?.LogoutTime,
            TodayProductiveHours = Math.Round((empTaskSeconds + empSupportSeconds) / 3600.0, 2),
            TodayBreakHours = todayBreakHours,
            TodayIdleHours = todayIdleHours,
            TodayNonProductiveHours = todayNonProductiveHours,
            TodayActivitiesCount = todayTaskLogs.Count + todaySupportLogs.Count + todayBreakLogs.Count + todayIdleLogs.Count,
            HasGraceViolationToday = todayGrace != null,
            MinutesLateToday = todayGrace?.MinutesLate ?? 0,
            TodayStatus = todayStatus,
            IsHalfDayToday = isHalfDayToday,
            ActiveTask = activeTask,
            TodayActivities = todayDtos
        };
    }

    public async Task<List<MonthlyProductionItemDto>> GetMonthlyProductionReportAsync(int month, int year, int? employeeId = null, int? departmentId = null)
    {
        var query = _context.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(e => e.Id == employeeId.Value);
        else if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var employees = await query.ToListAsync();
        var result = new List<MonthlyProductionItemDto>();

        int daysInMonth = DateTime.DaysInMonth(year, month);
        DateTime monthStartIst = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        DateTime monthEndIst = new DateTime(year, month, daysInMonth, 23, 59, 59, DateTimeKind.Unspecified);

        DateTime monthStartUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartIst, IstTimeZone);
        DateTime monthEndUtc = TimeZoneInfo.ConvertTimeToUtc(monthEndIst, IstTimeZone);

        foreach (var emp in employees)
        {
            var daysPresent = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= monthStartUtc && a.LoginTime <= monthEndUtc)
                .Select(a => a.LoginTime.Date)
                .Distinct()
                .CountAsync();

            var settings = await _settingService.GetTypedSettingsAsync();

            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.EmployeeId == emp.Id && t.StartTime >= monthStartUtc && t.StartTime <= monthEndUtc)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSeconds = taskLogs.Sum(t => ((GetEffectiveEndTime(t.StartTime, t.EndTime, settings)) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.EmployeeId == emp.Id && s.StartTime >= monthStartUtc && s.StartTime <= monthEndUtc)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToListAsync();
            var supportSeconds = supportLogs.Sum(s => ((GetEffectiveEndTime(s.StartTime, s.EndTime, settings)) - s.StartTime).TotalSeconds);

            var breakLogs = await _context.BreakLogs
                .Where(b => b.EmployeeId == emp.Id && b.StartTime >= monthStartUtc && b.StartTime <= monthEndUtc)
                .Select(b => new { b.StartTime, b.EndTime })
                .ToListAsync();
            var breakSeconds = breakLogs.Sum(b => ((GetEffectiveEndTime(b.StartTime, b.EndTime, settings)) - b.StartTime).TotalSeconds);

            var idleLogs = await _context.IdleTimeLogs
                .Where(i => i.EmployeeId == emp.Id && i.StartTime >= monthStartUtc && i.StartTime <= monthEndUtc)
                .Select(i => new { i.StartTime, i.EndTime })
                .ToListAsync();
            var idleSeconds = idleLogs.Sum(i => ((GetEffectiveEndTime(i.StartTime, i.EndTime, settings)) - i.StartTime).TotalSeconds);

            var tasksCompleted = await _context.WorkTasks
                .CountAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Completed && t.CreatedAt >= monthStartUtc && t.CreatedAt <= monthEndUtc);

            var monthLogs = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= monthStartUtc && a.LoginTime <= monthEndUtc)
                .ToListAsync();

            // Daily First Login Rule: Only the earliest valid login event per calendar working day is evaluated
            var firstLogsByDate = monthLogs
                .GroupBy(a => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone)))
                .Select(g => g.OrderBy(a => a.LoginTime).First())
                .ToList();

            var graceViolations = firstLogsByDate.Count(a => a.IsLate);

            result.Add(new MonthlyProductionItemDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.Name,
                DepartmentName = emp.Department?.Name ?? string.Empty,
                DaysPresent = daysPresent,
                ProductiveHours = Math.Round((taskSeconds + supportSeconds) / 3600.0, 2),
                BreakHours = Math.Round(breakSeconds / 3600.0, 2),
                IdleHours = Math.Round(idleSeconds / 3600.0, 2),
                NonProductiveHours = Math.Round((breakSeconds + supportSeconds + idleSeconds) / 3600.0, 2),
                TasksCompleted = tasksCompleted,
                GraceViolations = graceViolations
            });
        }

        return result;
    }

    public async Task<WorkDistributionReportDto> GetWorkDistributionReportAsync(int month, int year)
    {
        int daysInMonth = DateTime.DaysInMonth(year, month);
        DateTime monthStartIst = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        DateTime monthEndIst = new DateTime(year, month, daysInMonth, 23, 59, 59, DateTimeKind.Unspecified);

        DateTime monthStartUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartIst, IstTimeZone);
        DateTime monthEndUtc = TimeZoneInfo.ConvertTimeToUtc(monthEndIst, IstTimeZone);

        // Products distribution
        var products = await _context.Products.Where(p => p.IsActive).ToListAsync();
        var prodList = new List<ProductWorkDistributionDto>();

        foreach (var p in products)
        {
            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.ProductId == p.Id && t.StartTime >= monthStartUtc && t.StartTime <= monthEndUtc)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSec = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.ProductId == p.Id && s.StartTime >= monthStartUtc && s.StartTime <= monthEndUtc)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToListAsync();
            var supportSec = supportLogs.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

            prodList.Add(new ProductWorkDistributionDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                ProductCode = p.Code,
                TotalHours = Math.Round((taskSec + supportSec) / 3600.0, 2)
            });
        }

        // Clients distribution
        var clients = await _context.Clients.Where(c => c.IsActive).ToListAsync();
        var clientList = new List<ClientWorkDistributionDto>();

        foreach (var c in clients)
        {
            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.ClientId == c.Id && t.StartTime >= monthStartUtc && t.StartTime <= monthEndUtc)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSec = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.ClientId == c.Id && s.StartTime >= monthStartUtc && s.StartTime <= monthEndUtc)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToListAsync();
            var supportSec = supportLogs.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

            clientList.Add(new ClientWorkDistributionDto
            {
                ClientId = c.Id,
                ClientCompanyName = c.CompanyName,
                TotalHours = Math.Round((taskSec + supportSec) / 3600.0, 2)
            });
        }

        return new WorkDistributionReportDto
        {
            Products = prodList,
            Clients = clientList
        };
    }

    public async Task<List<DailyProductionItemDto>> GetDailyProductionReportAsync(DateTime startDate, DateTime endDate, int? employeeId = null, int? departmentId = null)
    {
        var settings = await _settingService.GetTypedSettingsAsync();
        var startIst = new DateTime(startDate.Year, startDate.Month, startDate.Day, 0, 0, 0, DateTimeKind.Unspecified);
        var endIst = new DateTime(endDate.Year, endDate.Month, endDate.Day, 0, 0, 0, DateTimeKind.Unspecified);

        if (startIst > endIst)
        {
            var temp = startIst;
            startIst = endIst;
            endIst = temp;
        }

        var query = _context.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (employeeId.HasValue)
            query = query.Where(e => e.Id == employeeId.Value);
        else if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var employees = await query.ToListAsync();
        var result = new List<DailyProductionItemDto>();

        var officeStartDt = DateTime.Today.Add(settings.OfficeStartTime);
        var graceEndDt = officeStartDt.AddMinutes(settings.GraceMinutes);

        string officeStartStr = officeStartDt.ToString("hh:mm tt");
        string graceEndStr = graceEndDt.ToString("hh:mm tt");

        var monthStartDate = new DateOnly(startIst.Year, startIst.Month, 1);
        var monthEndDate = new DateOnly(endIst.Year, endIst.Month, DateTime.DaysInMonth(endIst.Year, endIst.Month));

        var calendarEntriesList = await _context.AttendanceCalendars
            .Where(c => c.CalendarDate >= monthStartDate && c.CalendarDate <= monthEndDate)
            .ToListAsync();
        var calendarEntries = calendarEntriesList.ToDictionary(c => c.CalendarDate);

        var endIstFull = endIst.AddDays(1).AddTicks(-1);
        var approvedLeaves = await _context.LeaveRequests
            .Include(l => l.LeaveType)
            .Where(l => l.Status == RIIMS.Domain.Enums.RequestStatus.Approved &&
                        l.FromDate <= endIstFull && l.ToDate >= startIst)
            .ToListAsync();

        for (var currentDateIst = startIst; currentDateIst <= endIst; currentDateIst = currentDateIst.AddDays(1))
        {
            var nextDateIst = currentDateIst.AddDays(1);
            var startUtc = TimeZoneInfo.ConvertTimeToUtc(currentDateIst, IstTimeZone);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(nextDateIst, IstTimeZone);

            DateTime monthStartIst = new DateTime(currentDateIst.Year, currentDateIst.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
            DateTime monthStartUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartIst, IstTimeZone);

            foreach (var emp in employees)
            {
                var dayAttLogs = await _context.AttendanceLogs
                    .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= startUtc && a.LoginTime < endUtc)
                    .OrderBy(a => a.LoginTime)
                    .ToListAsync();

                var attendance = dayAttLogs.FirstOrDefault();

                var taskLogs = await _context.TaskTimeLogs
                    .Where(t => t.Task.EmployeeId == emp.Id && t.StartTime >= startUtc && t.StartTime < endUtc)
                    .Select(t => new { t.TaskId, t.StartTime, t.EndTime })
                    .ToListAsync();
                var taskSeconds = taskLogs.Sum(t => ((GetEffectiveEndTime(t.StartTime, t.EndTime, settings)) - t.StartTime).TotalSeconds);
                var workTaskCount = taskLogs.Select(t => t.TaskId).Distinct().Count();

                var supportLogs = await _context.SupportActivityLogs
                    .Where(s => s.EmployeeId == emp.Id && s.StartTime >= startUtc && s.StartTime < endUtc)
                    .Select(s => new { s.StartTime, s.EndTime })
                    .ToListAsync();
                var supportSeconds = supportLogs.Sum(s => ((GetEffectiveEndTime(s.StartTime, s.EndTime, settings)) - s.StartTime).TotalSeconds);
                var callCount = supportLogs.Count;

                var breakLogs = await _context.BreakLogs
                    .Where(b => b.EmployeeId == emp.Id && b.StartTime >= startUtc && b.StartTime < endUtc)
                    .Select(b => new { b.StartTime, b.EndTime })
                    .ToListAsync();
                var breakSeconds = breakLogs.Sum(b => ((GetEffectiveEndTime(b.StartTime, b.EndTime, settings)) - b.StartTime).TotalSeconds);
                var breakCount = breakLogs.Count;

                var idleLogs = await _context.IdleTimeLogs
                    .Where(i => i.EmployeeId == emp.Id && i.StartTime >= startUtc && i.StartTime < endUtc)
                    .Select(i => new { i.StartTime, i.EndTime })
                    .ToListAsync();
                var rawIdleSeconds = idleLogs.Sum(i => ((GetEffectiveEndTime(i.StartTime, i.EndTime, settings)) - i.StartTime).TotalSeconds);

                double totalSessionSec = 0;
                foreach (var att in dayAttLogs)
                {
                    var sessEnd = GetEffectiveEndTime(att.LoginTime, att.LogoutTime, settings);
                    if (sessEnd > att.LoginTime)
                    {
                        totalSessionSec += (sessEnd - att.LoginTime).TotalSeconds;
                    }
                }

                var dynamicIdleSec = Math.Max(0, totalSessionSec - (taskSeconds + supportSeconds + breakSeconds));
                var idleSeconds = Math.Max(rawIdleSeconds, dynamicIdleSec);

                var tasksCompleted = await _context.WorkTasks
                    .CountAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Completed && t.CreatedAt >= startUtc && t.CreatedAt < endUtc);

                var graceViolation = await _context.GraceTimeViolations
                    .FirstOrDefaultAsync(g => g.EmployeeId == emp.Id && g.Date >= currentDateIst && g.Date < nextDateIst);

                // Month-to-date attendance logs in IST range (1st of month up to selected date)
                var monthLogs = await _context.AttendanceLogs
                    .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= monthStartUtc && a.LoginTime < endUtc)
                    .ToListAsync();

                var empLeavesMtd = await _context.LeaveRequests
                    .Include(l => l.LeaveType)
                    .Where(l => l.EmployeeId == emp.Id && l.Status == RIIMS.Domain.Enums.RequestStatus.Approved && l.FromDate <= endUtc && l.ToDate >= monthStartUtc)
                    .ToListAsync();

                var empPermissionsMtd = await _context.PermissionRequests
                    .Where(p => p.EmployeeId == emp.Id && p.Status == RIIMS.Domain.Enums.RequestStatus.Approved && p.RequestDate.Year == currentDateIst.Year && p.RequestDate.Month == currentDateIst.Month && p.RequestDate <= currentDateIst)
                    .ToListAsync();

                var calDtosMtd = calendarEntries.Values.Select(c => new AttendanceCalendarDto
                {
                    Id = c.Id,
                    CalendarDate = c.CalendarDate,
                    Year = c.Year,
                    Month = c.Month,
                    DayType = c.DayType,
                    IsWorkingDay = c.IsWorkingDay,
                    IsHoliday = c.IsHoliday,
                    HolidayName = c.HolidayName
                }).ToList();

                var lopResultMtd = LeaveLopCalculator.Calculate(
                    emp.Id,
                    currentDateIst.Year,
                    currentDateIst.Month,
                    settings.MonthlyAllowedLeave,
                    settings.LateLoginsForHalfDay,
                    30000m,
                    calDtosMtd,
                    empLeavesMtd,
                    monthLogs,
                    empPermissionsMtd,
                    settings
                );

                decimal lopDays = lopResultMtd.TotalLOPDays;

                string status = "Absent";
                if (attendance != null)
                {
                    if (attendance.Status == "HalfDay Attendance")
                    {
                        status = "HalfDay Attendance";
                    }
                    else if (attendance.IsPermission) status = "Permission";
                    else if (attendance.IsLate)
                    {
                        var loginTimeIst = TimeZoneInfo.ConvertTimeFromUtc(attendance.LoginTime, IstTimeZone);
                        var permEnd = settings.OfficeStartTime.Add(TimeSpan.FromHours((double)settings.PermissionHours));
                        if (loginTimeIst.TimeOfDay > permEnd && !attendance.IsPermission)
                        {
                            status = "HalfDay Attendance";
                        }
                        else
                        {
                            status = "Late";
                        }
                    }
                    else if (attendance.LogoutTime.HasValue) status = "Present (Logged Out)";
                    else
                    {
                        bool isOnBreak = await _context.BreakLogs.AnyAsync(b => b.EndTime == null && b.EmployeeId == emp.Id);
                        bool isInSupport = await _context.SupportActivityLogs.AnyAsync(s => s.EndTime == null && s.EmployeeId == emp.Id);
                        bool isWorking = await _context.WorkTasks.AnyAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Running);

                        if (isOnBreak) status = "On Break";
                        else if (isInSupport) status = "In Support";
                        else if (isWorking) status = "Working";
                        else status = "Normal";
                    }
                }
                else
                {
                    var activeLeave = approvedLeaves.FirstOrDefault(l => l.EmployeeId == emp.Id && l.FromDate.Date <= currentDateIst.Date && l.ToDate.Date >= currentDateIst.Date);
                    if (activeLeave != null)
                    {
                        status = !string.IsNullOrWhiteSpace(activeLeave.LeaveType?.Name) ? activeLeave.LeaveType.Name : "Leave";
                    }
                    else
                    {
                        var curDateOnly = DateOnly.FromDateTime(currentDateIst);
                        if (calendarEntries.TryGetValue(curDateOnly, out var calEntry))
                        {
                            if (calEntry.IsHoliday)
                            {
                                status = !string.IsNullOrWhiteSpace(calEntry.HolidayName) ? calEntry.HolidayName : "Holiday";
                            }
                            else if (calEntry.DayType == RIIMS.Domain.Enums.AttendanceDayType.Weekend || !calEntry.IsWorkingDay)
                            {
                                status = "Weekend";
                            }
                        }
                        else if (currentDateIst.DayOfWeek == DayOfWeek.Saturday || currentDateIst.DayOfWeek == DayOfWeek.Sunday)
                        {
                            status = "Weekend";
                        }
                    }
                }

                result.Add(new DailyProductionItemDto
                {
                    EmployeeId = emp.Id,
                    AttendanceLogId = attendance?.Id,
                    EmployeeCode = emp.EmployeeCode,
                    EmployeeName = emp.Name,
                    DepartmentName = emp.Department?.Name ?? string.Empty,
                    Date = currentDateIst,
                    LoginTime = attendance?.LoginTime,
                    LogoutTime = attendance?.LogoutTime,
                    Status = status,
                    ProductiveHours = Math.Round((taskSeconds + supportSeconds) / 3600.0, 2),
                    WorkTaskCount = workTaskCount,
                    WorkTaskHours = Math.Round(taskSeconds / 3600.0, 2),
                    BreakCount = breakCount,
                    BreakHours = Math.Round(breakSeconds / 3600.0, 2),
                    CallCount = callCount,
                    CallHours = Math.Round(supportSeconds / 3600.0, 2),
                    IdleHours = Math.Round(idleSeconds / 3600.0, 2),
                    NonProductiveHours = Math.Round((breakSeconds + idleSeconds) / 3600.0, 2),
                    TasksCompleted = tasksCompleted,
                    MinutesLate = graceViolation?.MinutesLate ?? 0,
                    IsLate = attendance?.IsLate ?? false,
                    IsPermission = attendance?.IsPermission ?? false,
                    PermissionHours = attendance?.PermissionHours ?? 0,
                    OfficeStartTime = officeStartStr,
                    GraceEndTime = graceEndStr,
                    LateCount = lopResultMtd.TotalLateCount,
                    PermissionCount = lopResultMtd.PermissionCount,
                    LeaveCount = lopResultMtd.ActualLeaveDays,
                    LopDays = lopDays
                });
            }
        }

        return result.OrderByDescending(r => r.Date).ThenBy(r => r.EmployeeName).ToList();
    }

    public async Task<EmployeeDailyDetailDto> GetEmployeeDailyDetailAsync(int employeeId, DateTime startDate, DateTime endDate)
    {
        var startIst = startDate.Date;
        var endIst = endDate.Date.AddDays(1);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(startIst, IstTimeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(endIst, IstTimeZone);

        var emp = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == employeeId);

        if (emp == null)
            throw new KeyNotFoundException("Employee not found.");

        var attendance = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= startUtc && a.LoginTime < endUtc)
            .OrderBy(a => a.LoginTime)
            .FirstOrDefaultAsync();

        var graceViolation = await _context.GraceTimeViolations
            .FirstOrDefaultAsync(g => g.EmployeeId == employeeId && g.Date >= startIst && g.Date < endIst);

        // Fetch task IDs that have time logs recorded on this date range
        var taskIdsWorkedToday = await _context.TaskTimeLogs
            .Where(tl => tl.Task.EmployeeId == employeeId && tl.StartTime >= startUtc && tl.StartTime < endUtc)
            .Select(tl => tl.TaskId)
            .Distinct()
            .ToListAsync();

        // Fetch Work Tasks relevant to this date range
        var tasks = await _context.WorkTasks
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Where(t => t.EmployeeId == employeeId && (
                taskIdsWorkedToday.Contains(t.Id) ||
                (t.CreatedAt >= startUtc && t.CreatedAt < endUtc) ||
                (t.UpdatedAt >= startUtc && t.UpdatedAt < endUtc)
            ))
            .ToListAsync();

        var taskDtos = new List<DailyTaskDetailDto>();

        foreach (var task in tasks)
        {
            // Fetch time logs specifically recorded in this date range
            var taskLogsOnDate = await _context.TaskTimeLogs
                .Where(t => t.TaskId == task.Id && t.StartTime >= startUtc && t.StartTime < endUtc)
                .OrderBy(t => t.StartTime)
                .ToListAsync();

            var settings = await _settingService.GetTypedSettingsAsync();
            double taskSeconds = 0;
            List<RIIMS.Domain.Entities.TaskTimeLog> logsToMap;

            if (taskLogsOnDate.Count > 0)
            {
                logsToMap = taskLogsOnDate;
                taskSeconds = taskLogsOnDate.Sum(t => ((GetEffectiveEndTime(t.StartTime, t.EndTime, settings)) - t.StartTime).TotalSeconds);
            }
            else
            {
                logsToMap = await _context.TaskTimeLogs
                    .Where(t => t.TaskId == task.Id)
                    .OrderBy(t => t.StartTime)
                    .ToListAsync();
                taskSeconds = logsToMap.Sum(t => ((GetEffectiveEndTime(t.StartTime, t.EndTime, settings)) - t.StartTime).TotalSeconds);
            }

            var sessionDtos = logsToMap.Select(tl => {
                var effEnd = GetEffectiveEndTime(tl.StartTime, tl.EndTime, settings);
                return new DailyTaskSessionDto
                {
                    StartTime = tl.StartTime,
                    EndTime = tl.EndTime,
                    Duration = tl.EndTime.HasValue
                        ? FormatSecondsToHhMm((tl.EndTime.Value - tl.StartTime).TotalSeconds)
                        : FormatSecondsToHhMm((effEnd - tl.StartTime).TotalSeconds) + (effEnd == DateTime.UtcNow ? " (In Progress)" : "")
                };
            }).ToList();

            taskDtos.Add(new DailyTaskDetailDto
            {
                TaskId = task.Id,
                ProductName = task.Product?.Name ?? task.CustomProductName ?? string.Empty,
                ClientName = task.Client?.CompanyName ?? task.CustomClientName ?? string.Empty,
                ModuleName = task.ModuleName,
                Description = task.Description,
                Status = task.Status.ToString(),
                Sessions = sessionDtos,
                TotalTaskHours = Math.Round(taskSeconds / 3600.0, 2)
            });
        }

        // Fetch Breaks for the range
        var breaks = await _context.BreakLogs
            .Include(b => b.BreakType)
            .Include(b => b.HeldTask)
            .Where(b => b.EmployeeId == employeeId && b.StartTime >= startUtc && b.StartTime < endUtc)
            .OrderBy(b => b.StartTime)
            .ToListAsync();

        var allTaskTimeLogsOnDate = await _context.TaskTimeLogs
            .Include(t => t.Task)
            .Where(t => t.Task.EmployeeId == employeeId && t.StartTime >= startUtc && t.StartTime < endUtc)
            .OrderBy(t => t.StartTime)
            .ToListAsync();

        var settingsObj = await _settingService.GetTypedSettingsAsync();

        var breakDtos = breaks.Select(b => {
            var effEnd = GetEffectiveEndTime(b.StartTime, b.EndTime, settingsObj);

            string? moduleName = b.HeldTask?.ModuleName;
            if (string.IsNullOrEmpty(moduleName) && b.HeldTaskId.HasValue)
            {
                var ht = tasks.FirstOrDefault(t => t.Id == b.HeldTaskId.Value);
                if (ht != null) moduleName = ht.ModuleName;
            }

            if (string.IsNullOrEmpty(moduleName))
            {
                // Find the task time log that was active or started before/at this break's start time
                var relevantTimeLog = allTaskTimeLogsOnDate
                    .Where(tl => tl.StartTime <= b.StartTime)
                    .OrderByDescending(tl => tl.StartTime)
                    .FirstOrDefault();

                if (relevantTimeLog?.Task != null)
                {
                    moduleName = relevantTimeLog.Task.ModuleName;
                }
                else
                {
                    var anyTask = tasks.FirstOrDefault();
                    if (anyTask != null)
                    {
                        moduleName = anyTask.ModuleName;
                    }
                }
            }

            return new DailyBreakDetailDto
            {
                BreakTypeName = b.BreakType?.Name ?? "Break",
                HeldTaskModule = !string.IsNullOrEmpty(moduleName) ? moduleName : null,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Duration = b.EndTime.HasValue
                    ? FormatSecondsToHhMm((b.EndTime.Value - b.StartTime).TotalSeconds)
                    : FormatSecondsToHhMm((effEnd - b.StartTime).TotalSeconds) + (effEnd == DateTime.UtcNow ? " (In Progress)" : "")
            };
        }).ToList();

        // Fetch Support Activities for the range
        var supports = await _context.SupportActivityLogs
            .Include(s => s.ActivityType)
            .Include(s => s.Product)
            .Include(s => s.Client)
            .Where(s => s.EmployeeId == employeeId && s.StartTime >= startUtc && s.StartTime < endUtc)
            .ToListAsync();

        var supportDtos = supports.Select(s => {
            var effEnd = GetEffectiveEndTime(s.StartTime, s.EndTime, settingsObj);
            return new DailySupportDetailDto
            {
                ActivityTypeName = s.ActivityType?.Name ?? "Support",
                ProductName = s.Product?.Name ?? s.CustomProductName ?? string.Empty,
                ClientName = s.Client?.CompanyName ?? s.CustomClientName ?? string.Empty,
                Remarks = s.Remarks ?? string.Empty,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Duration = s.EndTime.HasValue
                    ? FormatSecondsToHhMm((s.EndTime.Value - s.StartTime).TotalSeconds)
                    : FormatSecondsToHhMm((effEnd - s.StartTime).TotalSeconds) + (effEnd == DateTime.UtcNow ? " (In Progress)" : "")
            };
        }).ToList();

        // Fetch Timeline Activities for the range
        var timelines = await _context.ActivityTimelines
            .Where(a => a.EmployeeId == employeeId && a.StartTime >= startUtc && a.StartTime < endUtc)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        var timelineDtos = timelines.Select(a => new ActivityTimelineDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            ActivityType = a.ActivityType,
            RefTable = a.RefTable,
            RefId = a.RefId,
            StartTime = a.StartTime,
            EndTime = a.EndTime,
            Status = a.Status,
            Remarks = a.Remarks,
            Duration = a.EndTime.HasValue ? FormatSecondsToHhMm((a.EndTime.Value - a.StartTime).TotalSeconds) : null
        }).ToList();

        // Fetch Idle Logs for the range
        var idleLogs = await _context.IdleTimeLogs
            .Where(i => i.EmployeeId == employeeId && i.StartTime >= startUtc && i.StartTime < endUtc)
            .OrderBy(i => i.StartTime)
            .ToListAsync();

        var idleDtos = idleLogs.Select(i => {
            var effEnd = GetEffectiveEndTime(i.StartTime, i.EndTime, settingsObj);
            return new DailyIdleDetailDto
            {
                StartTime = i.StartTime,
                EndTime = effEnd,
                Duration = i.EndTime.HasValue
                    ? FormatSecondsToHhMm((i.EndTime.Value - i.StartTime).TotalSeconds)
                    : FormatSecondsToHhMm((effEnd - i.StartTime).TotalSeconds) + (effEnd == DateTime.UtcNow ? " (In Progress)" : ""),
                Type = i.Type ?? "Idle"
            };
        }).ToList();

        var todayTaskLogs = await _context.TaskTimeLogs
            .Where(tl => tl.Task.EmployeeId == employeeId && tl.StartTime >= startUtc && tl.StartTime < endUtc)
            .ToListAsync();

        var totalTaskSec = todayTaskLogs.Sum(tl => ((GetEffectiveEndTime(tl.StartTime, tl.EndTime, settingsObj)) - tl.StartTime).TotalSeconds);
        var totalSuppSec = supports.Sum(s => ((GetEffectiveEndTime(s.StartTime, s.EndTime, settingsObj)) - s.StartTime).TotalSeconds);
        var totalBreakSec = breaks.Sum(b => ((GetEffectiveEndTime(b.StartTime, b.EndTime, settingsObj)) - b.StartTime).TotalSeconds);
        var rawIdleSec = idleLogs.Sum(i => ((GetEffectiveEndTime(i.StartTime, i.EndTime, settingsObj)) - i.StartTime).TotalSeconds);

        var dayAttLogs = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= startUtc && a.LoginTime < endUtc)
            .ToListAsync();

        double totalSessionSec = 0;
        foreach (var att in dayAttLogs)
        {
            var sessEnd = GetEffectiveEndTime(att.LoginTime, att.LogoutTime, settingsObj);
            if (sessEnd > att.LoginTime)
            {
                totalSessionSec += (sessEnd - att.LoginTime).TotalSeconds;
            }
        }

        var dynamicIdleSec = Math.Max(0, totalSessionSec - (totalTaskSec + totalSuppSec + totalBreakSec));
        var totalIdleSec = Math.Max(rawIdleSec, dynamicIdleSec);

        if (dayAttLogs.Any() && totalIdleSec > rawIdleSec)
        {
            var firstAtt = dayAttLogs.OrderBy(a => a.LoginTime).First();
            var sessEnd = GetEffectiveEndTime(firstAtt.LoginTime, firstAtt.LogoutTime, settingsObj);

            DateTime idleGapStart = firstAtt.LoginTime;
            if (idleDtos.Any())
            {
                var maxIdleEnd = idleDtos.Max(i => i.EndTime);
                if (maxIdleEnd > idleGapStart) idleGapStart = maxIdleEnd;
            }

            if (timelines.Any())
            {
                var maxTimelineEnd = timelines.Where(t => t.EndTime.HasValue).Select(t => t.EndTime!.Value).DefaultIfEmpty(idleGapStart).Max();
                if (maxTimelineEnd > idleGapStart) idleGapStart = maxTimelineEnd;
            }

            if (sessEnd > idleGapStart && (sessEnd - idleGapStart).TotalSeconds >= 10)
            {
                idleDtos.Add(new DailyIdleDetailDto
                {
                    StartTime = idleGapStart,
                    EndTime = sessEnd,
                    Duration = FormatSecondsToHhMm((sessEnd - idleGapStart).TotalSeconds) + (firstAtt.LogoutTime == null && sessEnd == DateTime.UtcNow ? " (In Progress)" : ""),
                    Type = "Idle Gap"
                });
            }
        }

        return new EmployeeDailyDetailDto
        {
            EmployeeId = emp.Id,
            EmployeeCode = emp.EmployeeCode,
            EmployeeName = emp.Name,
            DepartmentName = emp.Department?.Name ?? string.Empty,
            Date = startIst,
            LoginTime = attendance?.LoginTime,
            LogoutTime = attendance?.LogoutTime,
            Status = attendance != null ? (attendance.IsPermission ? "Permission" : (attendance.IsLate ? "Late" : "Present")) : "Absent",
            MinutesLate = graceViolation?.MinutesLate ?? 0,
            ProductiveHours = Math.Round((totalTaskSec + totalSuppSec) / 3600.0, 2),
            BreakHours = Math.Round(totalBreakSec / 3600.0, 2),
            IdleHours = Math.Round(totalIdleSec / 3600.0, 2),
            NonProductiveHours = Math.Round((totalBreakSec + totalIdleSec) / 3600.0, 2),
            Tasks = taskDtos,
            Breaks = breakDtos,
            SupportActivities = supportDtos,
            Idles = idleDtos,
            Timeline = timelineDtos
        };
    }

    public async Task<AdminNotificationSummaryDto> GetAdminNotificationsAsync(int adminUserId)
    {
        var (today, nextDay) = GetTodayIstUtcRange();

        var lateLogins = await _context.AttendanceLogs
            .Include(a => a.Employee)
            .Where(a => a.LoginTime >= today && a.LoginTime < nextDay && a.IsLate && !a.IsPermission)
            .OrderByDescending(a => a.LoginTime)
            .ToListAsync();

        var pendingLeaves = await _context.LeaveRequests
            .Include(l => l.Employee)
            .Where(l => l.Status == RIIMS.Domain.Enums.RequestStatus.Pending)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var pendingPermissions = await _context.PermissionRequests
            .Include(p => p.Employee)
            .Where(p => p.Status == RIIMS.Domain.Enums.RequestStatus.Pending)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        var celebrations = await _context.CelebrationLogs
            .Include(c => c.Employee)
            .Where(c => c.Channel == "RIIMS" || c.Channel == "Both")
            .OrderByDescending(c => c.SentAt)
            .Take(50)
            .ToListAsync();

        var readKeys = await _context.AdminNotificationReads
            .Where(r => r.AdminUserId == adminUserId)
            .Select(r => r.NotificationKey)
            .ToHashSetAsync();

        var list = new List<AdminNotificationItemDto>();

        foreach (var l in lateLogins)
        {
            string key = $"LateLogin_{l.Id}";
            var loginIst = TimeZoneInfo.ConvertTimeFromUtc(l.LoginTime, IstTimeZone);
            var expectedTime = loginIst.Date.AddHours(10);
            int minsLate = Math.Max(1, (int)(loginIst - expectedTime).TotalMinutes);

            list.Add(new AdminNotificationItemDto
            {
                Key = key,
                Id = l.Id,
                EmployeeId = l.EmployeeId,
                Category = "LateLogin",
                EmployeeName = l.Employee?.Name ?? "Employee",
                Title = "Late Login Alert",
                Message = $"{l.Employee?.Name ?? "Employee"} logged in late by {minsLate}m on {loginIst:dd MMM}.",
                Timestamp = l.LoginTime,
                TargetUrl = "/admin/attendance-calendar",
                IsRead = readKeys.Contains(key),
                MinutesLate = minsLate
            });
        }

        foreach (var req in pendingLeaves)
        {
            string key = $"LeaveRequest_{req.Id}";
            list.Add(new AdminNotificationItemDto
            {
                Key = key,
                Id = req.Id,
                EmployeeId = req.EmployeeId,
                Category = "LeaveRequest",
                EmployeeName = req.Employee?.Name ?? "Employee",
                Title = "Leave Request Submitted",
                Message = $"{req.Employee?.Name ?? "Employee"} submitted a leave request for {req.FromDate:dd MMM} – {req.ToDate:dd MMM}.",
                Timestamp = req.CreatedAt,
                TargetUrl = "/admin/approvals",
                IsRead = readKeys.Contains(key)
            });
        }

        foreach (var req in pendingPermissions)
        {
            string key = $"PermissionRequest_{req.Id}";
            list.Add(new AdminNotificationItemDto
            {
                Key = key,
                Id = req.Id,
                EmployeeId = req.EmployeeId,
                Category = "PermissionRequest",
                EmployeeName = req.Employee?.Name ?? "Employee",
                Title = "Permission Requested",
                Message = $"{req.Employee?.Name ?? "Employee"} requested permission on {req.RequestDate:dd MMM} from {req.FromTime:hh\\:mm} to {req.ToTime:hh\\:mm}.",
                Timestamp = req.CreatedAt,
                TargetUrl = "/admin/approvals",
                IsRead = readKeys.Contains(key)
            });
        }

        foreach (var c in celebrations)
        {
            string key = $"Celebration_{c.Id}";
            string title = c.EventType switch
            {
                "Birthday" => $"🎉 Birthday Celebration",
                "CompanyAnniversary" => $"🏆 Company Anniversary",
                "MarriageAnniversary" => $"💍 Marriage Anniversary",
                _ => $"🎉 Celebration Wish"
            };

            string message = c.EventType switch
            {
                "Birthday" => $"Warm Birthday wishes dispatched for {c.Employee?.Name ?? "Employee"}!",
                "CompanyAnniversary" => $"Company Anniversary wishes dispatched for {c.Employee?.Name ?? "Employee"}!",
                "MarriageAnniversary" => $"Marriage Anniversary wishes dispatched for {c.Employee?.Name ?? "Employee"}!",
                _ => $"Celebration wish dispatched for {c.Employee?.Name ?? "Employee"}!"
            };

            list.Add(new AdminNotificationItemDto
            {
                Key = key,
                Id = c.Id,
                EmployeeId = c.EmployeeId,
                Category = "Celebration",
                EmployeeName = c.Employee?.Name ?? "Employee",
                Title = title,
                Message = message,
                Timestamp = c.SentAt,
                TargetUrl = "/admin/settings",
                IsRead = readKeys.Contains(key)
            });
        }

        var orderedList = list.OrderByDescending(n => n.Timestamp).ToList();
        int unreadCount = orderedList.Count(n => !n.IsRead);

        return new AdminNotificationSummaryDto
        {
            TotalCount = list.Count,
            UnreadCount = unreadCount,
            LateLoginCount = lateLogins.Count,
            LeaveRequestCount = pendingLeaves.Count,
            PermissionRequestCount = pendingPermissions.Count,
            CelebrationCount = celebrations.Count,
            Notifications = orderedList
        };
    }

    public async Task MarkNotificationReadAsync(int adminUserId, string notificationKey)
    {
        if (string.IsNullOrWhiteSpace(notificationKey)) return;

        bool exists = await _context.AdminNotificationReads
            .AnyAsync(r => r.AdminUserId == adminUserId && r.NotificationKey == notificationKey);

        if (!exists)
        {
            _context.AdminNotificationReads.Add(new AdminNotificationRead
            {
                AdminUserId = adminUserId,
                NotificationKey = notificationKey,
                ReadAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllNotificationsReadAsync(int adminUserId)
    {
        var summary = await GetAdminNotificationsAsync(adminUserId);
        var unreadKeys = summary.Notifications.Where(n => !n.IsRead).Select(n => n.Key).ToList();

        foreach (var key in unreadKeys)
        {
            _context.AdminNotificationReads.Add(new AdminNotificationRead
            {
                AdminUserId = adminUserId,
                NotificationKey = key,
                ReadAt = DateTime.UtcNow
            });
        }

        if (unreadKeys.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    private static string FormatSecondsToHhMm(double totalSeconds)
    {
        if (double.IsNaN(totalSeconds) || totalSeconds <= 0) return "00h 00m";
        int totalMinutes = (int)Math.Round(totalSeconds / 60.0);
        int hours = totalMinutes / 60;
        int minutes = totalMinutes % 60;
        return $"{hours:D2}h {minutes:D2}m";
    }

    private static string FormatUtcToIstTime(DateTime utcTime)
    {
        var ist = TimeZoneInfo.ConvertTimeFromUtc(utcTime.Kind == DateTimeKind.Utc ? utcTime : DateTime.SpecifyKind(utcTime, DateTimeKind.Utc), IstTimeZone);
        return ist.ToString("hh:mm tt").ToLowerInvariant();
    }

    private class ActivityEventRow
    {
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string ActivityType { get; set; } = string.Empty; // Task, Break, Support Call, Idle Gap, N/A
        public string ActivityName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Product { get; set; } = string.Empty;
        public string Client { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public async Task<byte[]> ExportDailyProductionExcelAsync(DateTime startDate, DateTime endDate, int? employeeId = null, int? departmentId = null)
    {
        var startIst = startDate.Date;
        var endIst = endDate.Date;

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(startIst, IstTimeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(endIst.AddDays(1), IstTimeZone);

        // Fetch Employees (Deduplicated)
        var empQuery = _context.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive);

        if (employeeId.HasValue && employeeId.Value > 0)
        {
            empQuery = empQuery.Where(e => e.Id == employeeId.Value);
        }
        if (departmentId.HasValue && departmentId.Value > 0)
        {
            empQuery = empQuery.Where(e => e.DepartmentId == departmentId.Value);
        }

        var employeesList = await empQuery.AsNoTracking().OrderBy(e => e.Name).ToListAsync();
        var employees = employeesList.GroupBy(e => e.Id).Select(g => g.First()).ToList();

        var startDateOnly = DateOnly.FromDateTime(startIst);
        var endDateOnly = DateOnly.FromDateTime(endIst);

        // Fetch Attendance Calendars & Leaves for range
        var calendars = await _context.AttendanceCalendars
            .Where(c => c.CalendarDate >= startDateOnly && c.CalendarDate <= endDateOnly)
            .ToListAsync();

        var leaves = await _context.LeaveRequests
            .Include(l => l.LeaveType)
            .Where(l => l.IsActive && l.Status == RIIMS.Domain.Enums.RequestStatus.Approved && l.FromDate.Date <= endIst && l.ToDate.Date >= startIst)
            .ToListAsync();

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Daily Activity Timeline");

        // Title Block
        worksheet.Cell(1, 1).Value = "RIIMS V2 - Daily Activity Timeline Report";
        worksheet.Cell(1, 1).Style.Font.SetBold(true);
        worksheet.Cell(1, 1).Style.Font.SetFontSize(16);
        worksheet.Cell(1, 1).Style.Font.SetFontColor(XLColor.FromHtml("#1E3A8A"));

        string dateRangeText = startIst == endIst
            ? $"Date: {startIst:yyyy-MM-dd}"
            : $"Date Range: {startIst:yyyy-MM-dd} to {endIst:yyyy-MM-dd}";

        worksheet.Cell(2, 1).Value = $"{dateRangeText}   |   Generated: {DateTime.UtcNow:dd-MMM-yyyy HH:mm:ss UTC}";
        worksheet.Cell(2, 1).Style.Font.SetItalic(true);
        worksheet.Cell(2, 1).Style.Font.SetFontSize(10);
        worksheet.Cell(2, 1).Style.Font.SetFontColor(XLColor.FromHtml("#475569"));

        // Header Row at Row 4
        string[] headers = new[]
        {
            "Date",
            "Employee Name",
            "Employee Code",
            "Department",
            "Login Time",
            "Logout Time",
            "Attendance Status",
            "Activity Type",
            "Activity Name",
            "Description",
            "Product",
            "Client",
            "Start Time",
            "End Time",
            "Duration",
            "Status",
            "Total Productive Time",
            "Total Non-Productive Time",
            "Idle Time"
        };

        for (int col = 0; col < headers.Length; col++)
        {
            var cell = worksheet.Cell(4, col + 1);
            cell.Value = headers[col];
            cell.Style.Font.SetBold(true);
            cell.Style.Font.SetFontColor(XLColor.White);
            cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#1E3A8A"));
            cell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            cell.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Center);
        }
        worksheet.Row(4).Height = 26;

        int currentRow = 5;
        bool isFirstDateGroup = true;

        // Loop date by date descending (latest date first)
        for (var curDate = endIst; curDate >= startIst; curDate = curDate.AddDays(-1))
        {
            if (!isFirstDateGroup)
            {
                // Insert one blank separator row between date groups
                currentRow++;
            }
            isFirstDateGroup = false;

            var dayStartIst = curDate.Date;
            var dayEndIst = curDate.Date.AddDays(1);
            var dayStartUtc = TimeZoneInfo.ConvertTimeToUtc(dayStartIst, IstTimeZone);
            var dayEndUtc = TimeZoneInfo.ConvertTimeToUtc(dayEndIst, IstTimeZone);

            foreach (var emp in employees)
            {
                var attendance = await _context.AttendanceLogs
                    .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= dayStartUtc && a.LoginTime < dayEndUtc)
                    .OrderBy(a => a.LoginTime)
                    .FirstOrDefaultAsync();

                // Determine Attendance Status
                string statusStr = "Absent";
                if (attendance != null)
                {
                    statusStr = attendance.IsPermission ? "Permission" : (attendance.IsLate ? "Late" : "Working");
                }
                else
                {
                    var empLeave = leaves.FirstOrDefault(l => l.EmployeeId == emp.Id && l.FromDate.Date <= dayStartIst && l.ToDate.Date >= dayStartIst);
                    if (empLeave != null)
                    {
                        statusStr = empLeave.LeaveType?.Name ?? "Leave";
                    }
                    else
                    {
                        var curDateOnly = DateOnly.FromDateTime(curDate);
                        var cal = calendars.FirstOrDefault(c => c.CalendarDate == curDateOnly);
                        if (cal != null)
                        {
                            if (cal.IsHoliday) statusStr = cal.HolidayName ?? "Holiday";
                            else if (cal.DayType == RIIMS.Domain.Enums.AttendanceDayType.Weekend || !cal.IsWorkingDay || curDate.DayOfWeek == DayOfWeek.Saturday || curDate.DayOfWeek == DayOfWeek.Sunday) statusStr = "Weekend";
                        }
                        else if (curDate.DayOfWeek == DayOfWeek.Saturday || curDate.DayOfWeek == DayOfWeek.Sunday)
                        {
                            statusStr = "Weekend";
                        }
                    }
                }

                string loginStr = attendance != null ? FormatUtcToIstTime(attendance.LoginTime) : "--:--";
                string logoutStr = attendance?.LogoutTime != null ? FormatUtcToIstTime(attendance.LogoutTime.Value) : "--:--";

                // Fetch Task Time Logs
                var taskLogs = await _context.TaskTimeLogs
                    .Include(tl => tl.Task).ThenInclude(t => t.Product)
                    .Include(tl => tl.Task).ThenInclude(t => t.Client)
                    .Where(tl => tl.Task.EmployeeId == emp.Id && tl.StartTime >= dayStartUtc && tl.StartTime < dayEndUtc)
                    .OrderBy(tl => tl.StartTime)
                    .ToListAsync();

                // Fetch Work Tasks (fallback if no time logs for task)
                var taskIdsWorkedToday = taskLogs.Select(tl => tl.TaskId).Distinct().ToList();
                var tasksWithoutLogs = await _context.WorkTasks
                    .Include(t => t.Product)
                    .Include(t => t.Client)
                    .Where(t => t.EmployeeId == emp.Id && !taskIdsWorkedToday.Contains(t.Id) && (
                        (t.CreatedAt >= dayStartUtc && t.CreatedAt < dayEndUtc) ||
                        (t.UpdatedAt >= dayStartUtc && t.UpdatedAt < dayEndUtc)
                    ))
                    .ToListAsync();

                // Fetch Breaks
                var breaks = await _context.BreakLogs
                    .Include(b => b.BreakType)
                    .Where(b => b.EmployeeId == emp.Id && b.StartTime >= dayStartUtc && b.StartTime < dayEndUtc)
                    .OrderBy(b => b.StartTime)
                    .ToListAsync();

                // Fetch Support Activities
                var supports = await _context.SupportActivityLogs
                    .Include(s => s.ActivityType)
                    .Include(s => s.Product)
                    .Include(s => s.Client)
                    .Where(s => s.EmployeeId == emp.Id && s.StartTime >= dayStartUtc && s.StartTime < dayEndUtc)
                    .OrderBy(s => s.StartTime)
                    .ToListAsync();

                // Fetch Idles
                var idles = await _context.IdleTimeLogs
                    .Where(i => i.EmployeeId == emp.Id && i.StartTime >= dayStartUtc && i.StartTime < dayEndUtc)
                    .OrderBy(i => i.StartTime)
                    .ToListAsync();

                // Calculate Totals
                double totalTaskSec = taskLogs.Sum(tl => ((tl.EndTime ?? DateTime.UtcNow) - tl.StartTime).TotalSeconds);
                double totalSuppSec = supports.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);
                double totalBreakSec = breaks.Sum(b => ((b.EndTime ?? DateTime.UtcNow) - b.StartTime).TotalSeconds);
                double totalIdleSec = idles.Sum(i => ((i.EndTime ?? DateTime.UtcNow) - i.StartTime).TotalSeconds);

                double totalProductiveSec = totalTaskSec + totalSuppSec;
                double totalNonProductiveSec = totalBreakSec + totalSuppSec + totalIdleSec;

                string prodTimeStr = FormatSecondsToHhMm(totalProductiveSec);
                string nonProdTimeStr = FormatSecondsToHhMm(totalNonProductiveSec);
                string idleDurationStr = FormatSecondsToHhMm(totalIdleSec);

                // Build Chronological Timeline Events
                var eventRows = new List<ActivityEventRow>();

                // 1. Tasks from time logs
                foreach (var tl in taskLogs)
                {
                    double sec = ((tl.EndTime ?? DateTime.UtcNow) - tl.StartTime).TotalSeconds;
                    eventRows.Add(new ActivityEventRow
                    {
                        StartTime = tl.StartTime,
                        EndTime = tl.EndTime,
                        ActivityType = "Task",
                        ActivityName = tl.Task.ModuleName,
                        Description = tl.Task.Description,
                        Product = tl.Task.Product?.Name ?? tl.Task.CustomProductName ?? "",
                        Client = tl.Task.Client?.CompanyName ?? tl.Task.CustomClientName ?? "",
                        Duration = tl.EndTime.HasValue ? FormatSecondsToHhMm(sec) : FormatSecondsToHhMm(sec) + " (In Progress)",
                        Status = tl.Task.Status.ToString()
                    });
                }

                // 2. Tasks without time logs
                foreach (var t in tasksWithoutLogs)
                {
                    eventRows.Add(new ActivityEventRow
                    {
                        StartTime = t.CreatedAt,
                        EndTime = t.UpdatedAt,
                        ActivityType = "Task",
                        ActivityName = t.ModuleName,
                        Description = t.Description,
                        Product = t.Product?.Name ?? t.CustomProductName ?? "",
                        Client = t.Client?.CompanyName ?? t.CustomClientName ?? "",
                        Duration = "00h 00m",
                        Status = t.Status.ToString()
                    });
                }

                // 3. Breaks
                foreach (var b in breaks)
                {
                    double sec = b.EndTime.HasValue ? (b.EndTime.Value - b.StartTime).TotalSeconds : (DateTime.UtcNow - b.StartTime).TotalSeconds;
                    eventRows.Add(new ActivityEventRow
                    {
                        StartTime = b.StartTime,
                        EndTime = b.EndTime,
                        ActivityType = "Break",
                        ActivityName = b.BreakType?.Name ?? "Break",
                        Description = "",
                        Product = "",
                        Client = "",
                        Duration = b.EndTime.HasValue ? FormatSecondsToHhMm(sec) : "In Progress",
                        Status = ""
                    });
                }

                // 4. Support Calls
                foreach (var s in supports)
                {
                    double sec = s.EndTime.HasValue ? (s.EndTime.Value - s.StartTime).TotalSeconds : (DateTime.UtcNow - s.StartTime).TotalSeconds;
                    eventRows.Add(new ActivityEventRow
                    {
                        StartTime = s.StartTime,
                        EndTime = s.EndTime,
                        ActivityType = "Support Call",
                        ActivityName = s.ActivityType?.Name ?? "Support Call",
                        Description = s.Remarks ?? "",
                        Product = s.Product?.Name ?? s.CustomProductName ?? "",
                        Client = s.Client?.CompanyName ?? s.CustomClientName ?? "",
                        Duration = s.EndTime.HasValue ? FormatSecondsToHhMm(sec) : "In Progress",
                        Status = ""
                    });
                }

                // 5. Idle Gaps
                foreach (var i in idles)
                {
                    double sec = ((i.EndTime ?? DateTime.UtcNow) - i.StartTime).TotalSeconds;
                    eventRows.Add(new ActivityEventRow
                    {
                        StartTime = i.StartTime,
                        EndTime = i.EndTime,
                        ActivityType = "Idle Gap",
                        ActivityName = i.Type ?? "Idle Gap",
                        Description = i.Remarks ?? "",
                        Product = "",
                        Client = "",
                        Duration = i.EndTime.HasValue ? FormatSecondsToHhMm(sec) : FormatSecondsToHhMm(sec) + " (In Progress)",
                        Status = ""
                    });
                }

                // Sort Chronologically by StartTime
                eventRows = eventRows.OrderBy(ev => ev.StartTime).ToList();

                // If zero events recorded for employee on this date
                if (eventRows.Count == 0)
                {
                    eventRows.Add(new ActivityEventRow
                    {
                        StartTime = dayStartUtc,
                        EndTime = null,
                        ActivityType = "N/A",
                        ActivityName = "N/A",
                        Description = "",
                        Product = "",
                        Client = "",
                        Duration = "00h 00m",
                        Status = ""
                    });
                }

                // Write rows to Excel Sheet
                foreach (var ev in eventRows)
                {
                    var row = worksheet.Row(currentRow);

                    row.Cell(1).Value = curDate.ToString("yyyy-MM-dd");
                    row.Cell(2).Value = emp.Name;
                    row.Cell(3).Value = emp.EmployeeCode;
                    row.Cell(4).Value = emp.Department?.Name ?? "";
                    row.Cell(5).Value = loginStr;
                    row.Cell(6).Value = logoutStr;
                    row.Cell(7).Value = statusStr;

                    row.Cell(8).Value = ev.ActivityType;
                    row.Cell(9).Value = ev.ActivityName;
                    row.Cell(10).Value = ev.Description;
                    row.Cell(11).Value = ev.Product;
                    row.Cell(12).Value = ev.Client;
                    row.Cell(13).Value = ev.ActivityType != "N/A" ? FormatUtcToIstTime(ev.StartTime) : "--:--";
                    row.Cell(14).Value = ev.EndTime.HasValue ? FormatUtcToIstTime(ev.EndTime.Value) : (ev.ActivityType != "N/A" ? "In Progress" : "--:--");
                    row.Cell(15).Value = ev.Duration;
                    row.Cell(16).Value = ev.Status;

                    row.Cell(17).Value = prodTimeStr;
                    row.Cell(18).Value = nonProdTimeStr;
                    row.Cell(19).Value = idleDurationStr;

                    // Style Activity Type Pill (Column 8)
                    var actCell = row.Cell(8);
                    actCell.Style.Font.SetBold(true);
                    actCell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                    switch (ev.ActivityType)
                    {
                        case "Task":
                            actCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#E0F2FE"));
                            actCell.Style.Font.SetFontColor(XLColor.FromHtml("#0369A1"));
                            break;
                        case "Break":
                            actCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#FEF3C7"));
                            actCell.Style.Font.SetFontColor(XLColor.FromHtml("#B45309"));
                            break;
                        case "Support Call":
                            actCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#E0E7FF"));
                            actCell.Style.Font.SetFontColor(XLColor.FromHtml("#4338CA"));
                            break;
                        case "Idle Gap":
                            actCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F1F5F9"));
                            actCell.Style.Font.SetFontColor(XLColor.FromHtml("#475569"));
                            break;
                        default:
                            actCell.Style.Font.SetFontColor(XLColor.FromHtml("#94A3B8"));
                            break;
                    }

                    // Style Task Status (Column 16)
                    if (!string.IsNullOrEmpty(ev.Status))
                    {
                        var statusCell = row.Cell(16);
                        statusCell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                        switch (ev.Status)
                        {
                            case "Completed":
                            case "Running":
                                statusCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#DCFCE7"));
                                statusCell.Style.Font.SetFontColor(XLColor.FromHtml("#15803D"));
                                break;
                            case "OnHold":
                                statusCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#FFEDD5"));
                                statusCell.Style.Font.SetFontColor(XLColor.FromHtml("#C2410C"));
                                break;
                            case "Overdue":
                                statusCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#FEE2E2"));
                                statusCell.Style.Font.SetFontColor(XLColor.FromHtml("#B91C1C"));
                                break;
                            default:
                                statusCell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#FEF9C3"));
                                statusCell.Style.Font.SetFontColor(XLColor.FromHtml("#854D0E"));
                                break;
                        }
                    }

                    // Apply borders & alignment
                    for (int c = 1; c <= 19; c++)
                    {
                        var cell = row.Cell(c);
                        cell.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin);
                        cell.Style.Border.SetOutsideBorderColor(XLColor.FromHtml("#E2E8F0"));
                        if (c == 1 || c == 3 || c == 5 || c == 6 || c == 7 || c == 13 || c == 14 || c == 15 || c == 17 || c == 18 || c == 19)
                        {
                            cell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
                        }
                    }

                    // Zebra striping
                    if (currentRow % 2 == 0)
                    {
                        row.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F8FAFC"));
                    }

                    currentRow++;
                }
            }
        }

        // Freeze Header Row
        worksheet.SheetView.FreezeRows(4);

        // AutoFilter on all columns
        if (currentRow > 5)
        {
            worksheet.Range(4, 1, currentRow - 1, 19).SetAutoFilter();
        }

        // Auto-fit column widths
        worksheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}
