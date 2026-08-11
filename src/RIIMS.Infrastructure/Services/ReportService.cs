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

        return new EmployeeDashboardMetricsDto
        {
            EmployeeId = employeeId,
            EmployeeName = emp.Name,
            TodayLoginTime = todayAttendance?.LoginTime,
            TodayLogoutTime = todayAttendance?.LogoutTime,
            TodayProductiveHours = Math.Round((empTaskSeconds + empSupportSeconds) / 3600.0, 2),
            TodayBreakHours = Math.Round(empBreakSeconds / 3600.0, 2),
            TodayActivitiesCount = todayTaskLogs.Count + todaySupportLogs.Count + todayBreakLogs.Count,
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

        foreach (var emp in employees)
        {
            var daysPresent = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime.Month == month && a.LoginTime.Year == year)
                .Select(a => a.LoginTime.Date)
                .Distinct()
                .CountAsync();

            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.EmployeeId == emp.Id && t.StartTime.Month == month && t.StartTime.Year == year)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSeconds = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.EmployeeId == emp.Id && s.StartTime.Month == month && s.StartTime.Year == year)
                .Select(s => new { s.StartTime, s.EndTime })
                .ToListAsync();
            var supportSeconds = supportLogs.Sum(s => ((s.EndTime ?? DateTime.UtcNow) - s.StartTime).TotalSeconds);

            var breakLogs = await _context.BreakLogs
                .Where(b => b.EmployeeId == emp.Id && b.StartTime.Month == month && b.StartTime.Year == year)
                .Select(b => new { b.StartTime, b.EndTime })
                .ToListAsync();
            var breakSeconds = breakLogs.Sum(b => ((b.EndTime ?? DateTime.UtcNow) - b.StartTime).TotalSeconds);

            var tasksCompleted = await _context.WorkTasks
                .CountAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Completed && t.CreatedAt.Month == month && t.CreatedAt.Year == year);

            var graceViolations = await _context.GraceTimeViolations
                .CountAsync(g => g.EmployeeId == emp.Id && g.Date.Month == month && g.Date.Year == year);

            result.Add(new MonthlyProductionItemDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.Name,
                DepartmentName = emp.Department?.Name ?? string.Empty,
                DaysPresent = daysPresent,
                ProductiveHours = Math.Round((taskSeconds + supportSeconds) / 3600.0, 2),
                BreakHours = Math.Round(breakSeconds / 3600.0, 2),
                TasksCompleted = tasksCompleted,
                GraceViolations = graceViolations
            });
        }

        return result;
    }

    public async Task<WorkDistributionReportDto> GetWorkDistributionReportAsync(int month, int year)
    {
        // Products distribution
        var products = await _context.Products.Where(p => p.IsActive).ToListAsync();
        var prodList = new List<ProductWorkDistributionDto>();

        foreach (var p in products)
        {
            var taskLogs = await _context.TaskTimeLogs
                .Where(t => t.Task.ProductId == p.Id && t.StartTime.Month == month && t.StartTime.Year == year)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSec = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.ProductId == p.Id && s.StartTime.Month == month && s.StartTime.Year == year)
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
                .Where(t => t.Task.ClientId == c.Id && t.StartTime.Month == month && t.StartTime.Year == year)
                .Select(t => new { t.StartTime, t.EndTime })
                .ToListAsync();
            var taskSec = taskLogs.Sum(t => ((t.EndTime ?? DateTime.UtcNow) - t.StartTime).TotalSeconds);

            var supportLogs = await _context.SupportActivityLogs
                .Where(s => s.ClientId == c.Id && s.StartTime.Month == month && s.StartTime.Year == year)
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

            var tasksCompleted = await _context.WorkTasks
                .CountAsync(t => t.EmployeeId == emp.Id && t.Status == TaskStatusEnum.Completed && t.CreatedAt >= startUtc && t.CreatedAt < endUtc);

            var graceViolation = await _context.GraceTimeViolations
                .FirstOrDefaultAsync(g => g.EmployeeId == emp.Id && g.Date >= targetDateIst && g.Date < nextDateIst);

            // Monthly late login count for this employee
            var monthLogs = await _context.AttendanceLogs
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime.Year == targetDateIst.Year && a.LoginTime.Month == targetDateIst.Month)
                .ToListAsync();

            int monthlyLateCount = monthLogs.Count(a => a.IsLate && !a.IsPermission);
            int threshold = Math.Max(1, settings.LateLoginsForHalfDay);
            decimal lopDays = Math.Floor((decimal)monthlyLateCount / threshold) * 0.5m;

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
                TasksCompleted = tasksCompleted,
                MinutesLate = graceViolation?.MinutesLate ?? 0,
                IsLate = attendance?.IsLate ?? false,
                IsPermission = attendance?.IsPermission ?? false,
                PermissionHours = attendance?.PermissionHours ?? 0,
                OfficeStartTime = officeStartStr,
                GraceEndTime = graceEndStr,
                LateCount = monthlyLateCount,
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
            throw new KeyNotFoundException($"Employee with ID {employeeId} not found.");

        var attendance = await _context.AttendanceLogs
            .Where(a => a.EmployeeId == employeeId && a.LoginTime >= startUtc && a.LoginTime < endUtc)
            .OrderBy(a => a.LoginTime)
            .FirstOrDefaultAsync();

        var graceViolation = await _context.GraceTimeViolations
            .FirstOrDefaultAsync(g => g.EmployeeId == employeeId && g.Date >= targetDateIst && g.Date < nextDateIst);

        // Tasks & Time Logs
        var tasksOnDate = await _context.WorkTasks
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Where(t => t.EmployeeId == employeeId && t.TimeLogs.Any(tl => tl.StartTime >= startUtc && tl.StartTime < endUtc))
            .ToListAsync();

        var taskDetailDtos = new List<DailyTaskDetailDto>();
        double totalTaskSecs = 0;

        foreach (var task in tasksOnDate)
        {
            var dayLogs = task.TimeLogs
                .Where(tl => tl.StartTime >= startUtc && tl.StartTime < endUtc)
                .OrderBy(tl => tl.StartTime)
                .ToList();

            var sessionDtos = dayLogs.Select(tl =>
            {
                var dur = (tl.EndTime ?? DateTime.UtcNow) - tl.StartTime;
                totalTaskSecs += dur.TotalSeconds;
                return new DailyTaskSessionDto
                {
                    StartTime = tl.StartTime,
                    EndTime = tl.EndTime,
                    Duration = $"{dur.Hours:D2}:{dur.Minutes:D2}:{dur.Seconds:D2}"
                };
            }).ToList();

            double taskHours = Math.Round(dayLogs.Sum(tl => ((tl.EndTime ?? DateTime.UtcNow) - tl.StartTime).TotalSeconds) / 3600.0, 2);

            taskDetailDtos.Add(new DailyTaskDetailDto
            {
                TaskId = task.Id,
                ModuleName = task.ModuleName,
                Description = task.Description,
                ProductName = task.Product?.Name ?? string.Empty,
                ClientName = task.Client?.CompanyName ?? string.Empty,
                Status = task.Status.ToString(),
                Sessions = sessionDtos,
                TotalTaskHours = taskHours
            });
        }

        // Breaks
        var breakLogs = await _context.BreakLogs
            .Include(b => b.BreakType)
            .Include(b => b.HeldTask)
            .Where(b => b.EmployeeId == employeeId && b.StartTime >= startUtc && b.StartTime < endUtc)
            .OrderBy(b => b.StartTime)
            .ToListAsync();

        double totalBreakSecs = 0;
        var breakDtos = breakLogs.Select(b =>
        {
            var dur = (b.EndTime ?? DateTime.UtcNow) - b.StartTime;
            totalBreakSecs += dur.TotalSeconds;
            return new DailyBreakDetailDto
            {
                BreakTypeName = b.BreakType?.Name ?? "Break",
                HeldTaskModule = b.HeldTask?.ModuleName,
                StartTime = b.StartTime,
                EndTime = b.EndTime,
                Duration = $"{dur.Hours:D2}:{dur.Minutes:D2}:{dur.Seconds:D2}"
            };
        }).ToList();

        // Support Activities
        var supportLogs = await _context.SupportActivityLogs
            .Include(s => s.ActivityType)
            .Include(s => s.Product)
            .Include(s => s.Client)
            .Where(s => s.EmployeeId == employeeId && s.StartTime >= startUtc && s.StartTime < endUtc)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        double totalSupportSecs = 0;
        var supportDtos = supportLogs.Select(s =>
        {
            var dur = (s.EndTime ?? DateTime.UtcNow) - s.StartTime;
            totalSupportSecs += dur.TotalSeconds;
            return new DailySupportDetailDto
            {
                ActivityTypeName = s.ActivityType?.Name ?? "Support",
                ProductName = s.Product?.Name,
                ClientName = s.Client?.CompanyName,
                Remarks = s.Remarks,
                StartTime = s.StartTime,
                EndTime = s.EndTime,
                Duration = $"{dur.Hours:D2}:{dur.Minutes:D2}:{dur.Seconds:D2}"
            };
        }).ToList();

        // Activity Timeline
        var timelineLogs = await _context.ActivityTimelines
            .Where(a => a.EmployeeId == employeeId && a.StartTime >= startUtc && a.StartTime < endUtc)
            .OrderBy(a => a.StartTime)
            .ToListAsync();

        var timelineDtos = timelineLogs.Select(a => new ActivityTimelineDto
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

        string status = "Absent";
        if (attendance != null)
        {
            status = attendance.LogoutTime.HasValue ? "Present (Logged Out)" : "Present (Active)";
        }

        return new EmployeeDailyDetailDto
        {
            EmployeeId = emp.Id,
            EmployeeCode = emp.EmployeeCode,
            EmployeeName = emp.Name,
            DepartmentName = emp.Department?.Name ?? string.Empty,
            Date = targetDateIst,
            LoginTime = attendance?.LoginTime,
            LogoutTime = attendance?.LogoutTime,
            Status = status,
            ProductiveHours = Math.Round((totalTaskSecs + totalSupportSecs) / 3600.0, 2),
            BreakHours = Math.Round(totalBreakSecs / 3600.0, 2),
            MinutesLate = graceViolation?.MinutesLate ?? 0,
            Tasks = taskDetailDtos,
            Breaks = breakDtos,
            SupportActivities = supportDtos,
            Timeline = timelineDtos
        };
    }
}
