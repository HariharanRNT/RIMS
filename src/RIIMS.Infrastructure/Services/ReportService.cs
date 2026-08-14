using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Report;
using RIIMS.Application.DTOs.Timeline;
using RIIMS.Application.Interfaces;
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
        var empIdleSeconds = todayIdleLogs
            .Sum(i => (i.EndTime - i.StartTime).TotalSeconds);

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
        var todayNonProductiveHours = Math.Round((empBreakSeconds + empSupportSeconds + empIdleSeconds) / 3600.0, 2);

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
            ActiveTask = activeTask,
            TodayActivities = todayDtos
        };
    }

    public async Task<List<MonthlyProductionItemDto>> GetMonthlyProductionReportAsync(int month, int year, int? departmentId = null)
    {
        var query = _context.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (departmentId.HasValue)
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

            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.EmployeeId == emp.Id && t.StartTime >= monthStartUtc && t.StartTime <= monthEndUtc)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSeconds = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.EmployeeId == emp.Id && s.StartTime >= monthStartUtc && s.StartTime <= monthEndUtc)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToListAsync();
            var supportSeconds = supportLogs.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

            var breakLogs = await _context.BreakLogs
                .Where(b => b.EmployeeId == emp.Id && b.StartTime >= monthStartUtc && b.StartTime <= monthEndUtc)
                .Select(b => new { b.StartTime, b.EndTime })
                .ToListAsync();
            var breakSeconds = breakLogs.Sum(b => ((b.EndTime ?? DateTime.UtcNow) - b.StartTime).TotalSeconds);

            var idleLogs = await _context.IdleTimeLogs
                .Where(i => i.EmployeeId == emp.Id && i.StartTime >= monthStartUtc && i.StartTime <= monthEndUtc)
                .Select(i => new { i.StartTime, i.EndTime })
                .ToListAsync();
            var idleSeconds = idleLogs.Sum(i => (i.EndTime - i.StartTime).TotalSeconds);

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

    public async Task<List<DailyProductionItemDto>> GetDailyProductionReportAsync(DateTime date, int? departmentId = null)
    {
        var settings = await _settingService.GetTypedSettingsAsync();
        var targetDateIst = date.Date;
        var nextDateIst = targetDateIst.AddDays(1);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(targetDateIst, IstTimeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(nextDateIst, IstTimeZone);

        DateTime monthStartIst = new DateTime(targetDateIst.Year, targetDateIst.Month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        DateTime monthStartUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartIst, IstTimeZone);

        var query = _context.Employees
            .Include(e => e.Department)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (departmentId.HasValue)
            query = query.Where(e => e.DepartmentId == departmentId.Value);

        var employees = await query.ToListAsync();
        var result = new List<DailyProductionItemDto>();

        var officeStartDt = DateTime.Today.Add(settings.OfficeStartTime);
        var graceEndDt = officeStartDt.AddMinutes(settings.GraceMinutes);

        string officeStartStr = officeStartDt.ToString("hh:mm tt");
        string graceEndStr = graceEndDt.ToString("hh:mm tt");

        foreach (var emp in employees)
        {
            var attendance = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= startUtc && a.LoginTime < endUtc)
                .OrderBy(a => a.LoginTime)
                .FirstOrDefaultAsync();

            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.EmployeeId == emp.Id && t.StartTime >= startUtc && t.StartTime < endUtc)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSeconds = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.EmployeeId == emp.Id && s.StartTime >= startUtc && s.StartTime < endUtc)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToListAsync();
            var supportSeconds = supportLogs.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

            var breakLogs = await _context.BreakLogs
                .Where(b => b.EmployeeId == emp.Id && b.StartTime >= startUtc && b.StartTime < endUtc)
                .Select(b => new { b.StartTime, b.EndTime })
                .ToListAsync();
            var breakSeconds = breakLogs.Sum(b => ((b.EndTime ?? DateTime.UtcNow) - b.StartTime).TotalSeconds);

            var idleLogs = await _context.IdleTimeLogs
                .Where(i => i.EmployeeId == emp.Id && i.StartTime >= startUtc && i.StartTime < endUtc)
                .Select(i => new { i.StartTime, i.EndTime })
                .ToListAsync();
            var idleSeconds = idleLogs.Sum(i => (i.EndTime - i.StartTime).TotalSeconds);

            var tasksCompleted = await _context.WorkTasks
                .CountAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Completed && t.CreatedAt >= startUtc && t.CreatedAt < endUtc);

            var graceViolation = await _context.GraceTimeViolations
                .FirstOrDefaultAsync(g => g.EmployeeId == emp.Id && g.Date >= targetDateIst && g.Date < nextDateIst);

            // Month-to-date attendance logs in IST range (1st of month up to selected date)
            var monthLogs = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= monthStartUtc && a.LoginTime < endUtc)
                .ToListAsync();

            // Daily First Login Rule: Filter to only the earliest login event per calendar working day
            var firstLogsByDate = monthLogs
                .GroupBy(a => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone)))
                .Select(g => g.OrderBy(a => a.LoginTime).First())
                .ToList();

            int totalLateCount = firstLogsByDate.Count(a => a.IsLate);
            int unpermissionedLateCount = firstLogsByDate.Count(a => a.IsLate && !a.IsPermission);
            int threshold = Math.Max(1, settings.LateLoginsForHalfDay);
            decimal lopDays = Math.Floor((decimal)unpermissionedLateCount / threshold) * 0.5m;

            int monthPermissionCount = await _context.PermissionRequests
                .AsNoTracking()
                .Where(p => p.EmployeeId == emp.Id && p.Status == RIIMS.Domain.Enums.RequestStatus.Approved && p.RequestDate.Year == targetDateIst.Year && p.RequestDate.Month == targetDateIst.Month && p.RequestDate <= targetDateIst)
                .CountAsync();

            string status = "Absent";
            if (attendance != null)
            {
                if (attendance.IsPermission) status = "Permission";
                else if (attendance.IsLate) status = "Late";
                else if (attendance.LogoutTime.HasValue) status = "Present (Logged Out)";
                else
                {
                    bool isOnBreak = await _context.BreakLogs.AnyAsync(b => b.EmployeeId == emp.Id && b.EndTime == null);
                    bool isInSupport = await _context.SupportActivityLogs.AnyAsync(s => s.EmployeeId == emp.Id && s.EndTime == null);
                    bool isWorking = await _context.WorkTasks.AnyAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Running);

                    if (isOnBreak) status = "On Break";
                    else if (isInSupport) status = "In Support";
                    else if (isWorking) status = "Working";
                    else status = "Normal";
                }
            }

            result.Add(new DailyProductionItemDto
            {
                EmployeeId = emp.Id,
                AttendanceLogId = attendance?.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.Name,
                DepartmentName = emp.Department?.Name ?? string.Empty,
                LoginTime = attendance?.LoginTime,
                LogoutTime = attendance?.LogoutTime,
                Status = status,
                ProductiveHours = Math.Round((taskSeconds + supportSeconds) / 3600.0, 2),
                BreakHours = Math.Round(breakSeconds / 3600.0, 2),
                IdleHours = Math.Round(idleSeconds / 3600.0, 2),
                NonProductiveHours = Math.Round((breakSeconds + supportSeconds + idleSeconds) / 3600.0, 2),
                TasksCompleted = tasksCompleted,
                MinutesLate = graceViolation?.MinutesLate ?? 0,
                IsLate = attendance?.IsLate ?? false,
                IsPermission = attendance?.IsPermission ?? false,
                PermissionHours = attendance?.PermissionHours ?? 0,
                OfficeStartTime = officeStartStr,
                GraceEndTime = graceEndStr,
                LateCount = totalLateCount,
                PermissionCount = monthPermissionCount,
                LopDays = lopDays
            });
        }

        return result;
    }

    public async Task<EmployeeDailyDetailDto> GetEmployeeDailyDetailAsync(int employeeId, DateTime date)
    {
        var targetDateIst = date.Date;
        var nextDateIst = targetDateIst.AddDays(1);

        var startUtc = TimeZoneInfo.ConvertTimeToUtc(targetDateIst, IstTimeZone);
        var endUtc = TimeZoneInfo.ConvertTimeToUtc(nextDateIst, IstTimeZone);

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
            .FirstOrDefaultAsync(g => g.EmployeeId == employeeId && g.Date >= targetDateIst && g.Date < nextDateIst);

        // Fetch task IDs that have time logs recorded on this date
        var taskIdsWorkedToday = await _context.TaskTimeLogs
            .Where(tl => tl.Task.EmployeeId == employeeId && tl.StartTime >= startUtc && tl.StartTime < endUtc)
            .Select(tl => tl.TaskId)
            .Distinct()
            .ToListAsync();

        // Fetch Work Tasks relevant to this date
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
            // Sum time logs specifically recorded on this date
            var taskLogsOnDate = await _context.TaskTimeLogs
                .Where(t => t.TaskId == task.Id && t.StartTime >= startUtc && t.StartTime < endUtc)
                .ToListAsync();

            double taskSeconds = 0;
            if (taskLogsOnDate.Count > 0)
            {
                taskSeconds = taskLogsOnDate.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);
            }
            else
            {
                var allTaskLogs = await _context.TaskTimeLogs
                    .Where(t => t.TaskId == task.Id)
                    .ToListAsync();
                taskSeconds = allTaskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);
            }

            taskDtos.Add(new DailyTaskDetailDto
            {
                TaskId = task.Id,
                ProductName = task.Product?.Name ?? task.CustomProductName ?? string.Empty,
                ClientName = task.Client?.CompanyName ?? task.CustomClientName ?? string.Empty,
                ModuleName = task.ModuleName,
                Description = task.Description,
                Status = task.Status.ToString(),
                TotalTaskHours = Math.Round(taskSeconds / 3600.0, 2)
            });
        }

        // Fetch Breaks for the day
        var breaks = await _context.BreakLogs
            .Include(b => b.BreakType)
            .Where(b => b.EmployeeId == employeeId && b.StartTime >= startUtc && b.StartTime < endUtc)
            .ToListAsync();

        var breakDtos = breaks.Select(b => new DailyBreakDetailDto
        {
            BreakTypeName = b.BreakType?.Name ?? "Break",
            StartTime = b.StartTime,
            EndTime = b.EndTime,
            Duration = b.EndTime.HasValue
                ? ((b.EndTime.Value - b.StartTime).TotalSeconds / 3600.0).ToString("0.00") + " hrs"
                : "In Progress"
        }).ToList();

        // Fetch Support Activities for the day
        var supports = await _context.SupportActivityLogs
            .Include(s => s.ActivityType)
            .Include(s => s.Product)
            .Include(s => s.Client)
            .Where(s => s.EmployeeId == employeeId && s.StartTime >= startUtc && s.StartTime < endUtc)
            .ToListAsync();

        var supportDtos = supports.Select(s => new DailySupportDetailDto
        {
            ActivityTypeName = s.ActivityType?.Name ?? "Support",
            ProductName = s.Product?.Name ?? s.CustomProductName ?? string.Empty,
            ClientName = s.Client?.CompanyName ?? s.CustomClientName ?? string.Empty,
            Remarks = s.Remarks ?? string.Empty,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            Duration = s.EndTime.HasValue
                ? ((s.EndTime.Value - s.StartTime).TotalSeconds / 3600.0).ToString("0.00") + " hrs"
                : "In Progress"
        }).ToList();

        // Fetch Timeline Activities for the day
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
            Duration = a.EndTime.HasValue ? (a.EndTime.Value - a.StartTime).ToString(@"hh\:mm\:ss") : null
        }).ToList();

        var todayTaskLogs = await _context.TaskTimeLogs
            .Where(tl => tl.Task.EmployeeId == employeeId && tl.StartTime >= startUtc && tl.StartTime < endUtc)
            .ToListAsync();

        var totalTaskSec = todayTaskLogs.Sum(tl => ((tl.EndTime ?? DateTime.UtcNow) - tl.StartTime).TotalSeconds);
        var totalSuppSec = supports.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);
        var totalBreakSec = breaks.Sum(b => ((b.EndTime ?? DateTime.UtcNow) - b.StartTime).TotalSeconds);

        return new EmployeeDailyDetailDto
        {
            EmployeeId = emp.Id,
            EmployeeCode = emp.EmployeeCode,
            EmployeeName = emp.Name,
            DepartmentName = emp.Department?.Name ?? string.Empty,
            Date = targetDateIst,
            LoginTime = attendance?.LoginTime,
            LogoutTime = attendance?.LogoutTime,
            Status = attendance != null ? (attendance.IsPermission ? "Permission" : (attendance.IsLate ? "Late" : "Present")) : "Absent",
            MinutesLate = graceViolation?.MinutesLate ?? 0,
            ProductiveHours = Math.Round((totalTaskSec + totalSuppSec) / 3600.0, 2),
            BreakHours = Math.Round(totalBreakSec / 3600.0, 2),
            Tasks = taskDtos,
            Breaks = breakDtos,
            SupportActivities = supportDtos,
            Timeline = timelineDtos
        };
    }

    public async Task<AdminNotificationSummaryDto> GetAdminNotificationsAsync()
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

        var list = new List<AdminNotificationItemDto>();

        foreach (var l in lateLogins)
        {
            list.Add(new AdminNotificationItemDto
            {
                Id = l.Id,
                Category = "LateLogin",
                EmployeeName = l.Employee?.Name ?? "Employee",
                Title = "Late Login Alert",
                Message = $"{l.Employee?.Name ?? "Employee"} logged in late at {TimeZoneInfo.ConvertTimeFromUtc(l.LoginTime, IstTimeZone):hh:mm tt}.",
                Timestamp = l.LoginTime,
                TargetUrl = "/admin/reports"
            });
        }

        foreach (var req in pendingLeaves)
        {
            list.Add(new AdminNotificationItemDto
            {
                Id = req.Id,
                Category = "LeaveRequest",
                EmployeeName = req.Employee?.Name ?? "Employee",
                Title = "Pending Leave Request",
                Message = $"{req.Employee?.Name ?? "Employee"} requested leave from {req.FromDate:dd MMM} to {req.ToDate:dd MMM}.",
                Timestamp = req.CreatedAt,
                TargetUrl = "/admin/approvals"
            });
        }

        foreach (var req in pendingPermissions)
        {
            list.Add(new AdminNotificationItemDto
            {
                Id = req.Id,
                Category = "PermissionRequest",
                EmployeeName = req.Employee?.Name ?? "Employee",
                Title = "Pending Permission Request",
                Message = $"{req.Employee?.Name ?? "Employee"} requested permission for {req.RequestDate:dd MMM}.",
                Timestamp = req.CreatedAt,
                TargetUrl = "/admin/approvals"
            });
        }

        return new AdminNotificationSummaryDto
        {
            TotalCount = list.Count,
            LateLoginCount = lateLogins.Count,
            LeaveRequestCount = pendingLeaves.Count,
            PermissionRequestCount = pendingPermissions.Count,
            Notifications = list.OrderByDescending(n => n.Timestamp).ToList()
        };
    }
}
