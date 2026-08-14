using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Support;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class SupportActivityService : ISupportActivityService
{
    private readonly RiimsDbContext _context;

    public SupportActivityService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<SupportLogDto> StartSupportAsync(int employeeId, StartSupportRequest request)
    {
        var activeBreak = await _context.BreakLogs
            .AnyAsync(b => b.EmployeeId == employeeId && b.EndTime == null);

        if (activeBreak)
            throw new InvalidOperationException("Cannot start a support activity while a break is active. Please stop your break first.");

        var existingActive = await _context.SupportActivityLogs
            .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.EndTime == null);

        if (existingActive != null)
            throw new InvalidOperationException("You already have an active support activity.");

        var now = DateTime.UtcNow;

        // Auto-hold running task (Business Rule #2)
        int? heldTaskId = null;
        var runningTask = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running);

        if (runningTask != null)
        {
            heldTaskId = runningTask.Id;
            runningTask.Status = TaskStatusEnum.OnHold;

            var openTimeLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == runningTask.Id && tl.EndTime == null);

            if (openTimeLog != null) openTimeLog.EndTime = now;

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = runningTask.Id,
                StartTime = openTimeLog?.StartTime ?? now,
                EndTime = now,
                Status = "OnHold",
                Remarks = "Task paused for support activity"
            });
        }

        var log = new SupportActivityLog
        {
            EmployeeId = employeeId,
            ActivityTypeId = request.ActivityTypeId,
            HeldTaskId = heldTaskId,
            StartTime = now
        };

        _context.SupportActivityLogs.Add(log);

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "SupportActivity",
            RefTable = "SupportActivityLogs",
            RefId = log.Id,
            StartTime = now,
            Status = "Active",
            Remarks = "Started support activity"
        });

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(log.Id))!;
    }

    public async Task<SupportLogDto> StopSupportAsync(int supportLogId, int employeeId, StopSupportRequest request)
    {
        var log = await _context.SupportActivityLogs
            .FirstOrDefaultAsync(s => s.Id == supportLogId && s.EmployeeId == employeeId && s.EndTime == null);

        if (log == null)
            throw new KeyNotFoundException("Active support activity session not found.");

        // Rule 6: All support activities require Remarks, Product, and Client before stopping
        if (string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException("Remarks are required to stop support activity.");

        bool hasProduct = (request.ProductId.HasValue && request.ProductId > 0) || !string.IsNullOrWhiteSpace(request.CustomProductName);
        if (!hasProduct)
            throw new InvalidOperationException("Product selection or custom product name is required.");

        bool hasClient = (request.ClientId.HasValue && request.ClientId > 0) || !string.IsNullOrWhiteSpace(request.CustomClientName);
        if (!hasClient)
            throw new InvalidOperationException("Client selection or custom client name is required.");

        var now = DateTime.UtcNow;
        log.EndTime = now;
        log.Remarks = request.Remarks.Trim();

        if (request.ProductId.HasValue && request.ProductId > 0)
        {
            log.ProductId = request.ProductId.Value;
            log.CustomProductName = null;
        }
        else
        {
            log.ProductId = null;
            log.CustomProductName = request.CustomProductName?.Trim();
        }

        if (request.ClientId.HasValue && request.ClientId > 0)
        {
            log.ClientId = request.ClientId.Value;
            log.CustomClientName = null;
        }
        else
        {
            log.ClientId = null;
            log.CustomClientName = request.CustomClientName?.Trim();
        }

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "SupportActivity",
            RefTable = "SupportActivityLogs",
            RefId = log.Id,
            StartTime = log.StartTime,
            EndTime = now,
            Status = "Stopped",
            Remarks = request.Remarks.Trim()
        });

        // Auto-resume held task (Business Rule #3)
        if (log.HeldTaskId.HasValue)
        {
            var heldTask = await _context.WorkTasks.FindAsync(log.HeldTaskId.Value);
            if (heldTask != null && heldTask.Status == TaskStatusEnum.OnHold)
            {
                heldTask.Status = TaskStatusEnum.Running;

                _context.TaskTimeLogs.Add(new TaskTimeLog
                {
                    TaskId = heldTask.Id,
                    StartTime = now
                });

                _context.ActivityTimelines.Add(new ActivityTimeline
                {
                    EmployeeId = employeeId,
                    ActivityType = "Task",
                    RefTable = "Tasks",
                    RefId = heldTask.Id,
                    StartTime = now,
                    Status = "Resumed",
                    Remarks = "Auto-resumed task after support activity"
                });
            }
        }

        await _context.SaveChangesAsync();
        return (await GetByIdAsync(supportLogId))!;
    }

    public async Task<DemoFollowUpDto> CompleteDemoAsync(int employeeId, CompleteDemoRequest request)
    {
        var log = await _context.SupportActivityLogs
            .FirstOrDefaultAsync(s => s.Id == request.SupportLogId && s.EmployeeId == employeeId && s.EndTime == null);

        if (log == null)
            throw new KeyNotFoundException("Active Demo support activity session not found.");

        if (string.IsNullOrWhiteSpace(request.ReviewRemarks))
            throw new InvalidOperationException("Review / Remarks are required to complete Demo.");

        bool hasProduct = (request.ProductId.HasValue && request.ProductId > 0) || !string.IsNullOrWhiteSpace(request.CustomProductName);
        if (!hasProduct)
            throw new InvalidOperationException("Product selection or custom product name is required.");

        bool hasClient = (request.ClientId.HasValue && request.ClientId > 0) || !string.IsNullOrWhiteSpace(request.CustomClientName);
        if (!hasClient)
            throw new InvalidOperationException("Client selection or custom client name is required.");

        if (request.FollowUpDate == default)
            throw new InvalidOperationException("Follow-Up Date is required.");

        var now = DateTime.UtcNow;
        log.EndTime = now;
        log.Remarks = request.ReviewRemarks.Trim();

        int? targetProductId = null;
        string? targetCustomProdName = null;
        if (request.ProductId.HasValue && request.ProductId > 0)
        {
            targetProductId = request.ProductId.Value;
            log.ProductId = targetProductId;
            log.CustomProductName = null;
        }
        else
        {
            targetCustomProdName = request.CustomProductName?.Trim();
            log.ProductId = null;
            log.CustomProductName = targetCustomProdName;
        }

        int? targetClientId = null;
        string? targetCustomClientName = null;
        if (request.ClientId.HasValue && request.ClientId > 0)
        {
            targetClientId = request.ClientId.Value;
            log.ClientId = targetClientId;
            log.CustomClientName = null;
        }
        else
        {
            targetCustomClientName = request.CustomClientName?.Trim();
            log.ClientId = null;
            log.CustomClientName = targetCustomClientName;
        }

        // Create DemoFollowUp entity
        var followUp = new DemoFollowUp
        {
            EmployeeId = employeeId,
            SupportActivityLogId = log.Id,
            ProductId = targetProductId,
            CustomProductName = targetCustomProdName,
            ClientId = targetClientId,
            CustomClientName = targetCustomClientName,
            ReviewRemarks = request.ReviewRemarks.Trim(),
            FollowUpDate = request.FollowUpDate.Date,
            Status = DemoFollowUpStatus.Pending
        };

        _context.DemoFollowUps.Add(followUp);

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "SupportActivity",
            RefTable = "SupportActivityLogs",
            RefId = log.Id,
            StartTime = log.StartTime,
            EndTime = now,
            Status = "Completed",
            Remarks = $"Demo Completed. Follow-up scheduled for {request.FollowUpDate:yyyy-MM-dd}"
        });

        // Auto-resume held task
        if (log.HeldTaskId.HasValue)
        {
            var heldTask = await _context.WorkTasks.FindAsync(log.HeldTaskId.Value);
            if (heldTask != null && heldTask.Status == TaskStatusEnum.OnHold)
            {
                heldTask.Status = TaskStatusEnum.Running;

                _context.TaskTimeLogs.Add(new TaskTimeLog
                {
                    TaskId = heldTask.Id,
                    StartTime = now
                });

                _context.ActivityTimelines.Add(new ActivityTimeline
                {
                    EmployeeId = employeeId,
                    ActivityType = "Task",
                    RefTable = "Tasks",
                    RefId = heldTask.Id,
                    StartTime = now,
                    Status = "Resumed",
                    Remarks = "Auto-resumed task after demo activity"
                });
            }
        }

        await _context.SaveChangesAsync();
        return MapDemoFollowUpToDto(followUp);
    }

    public async Task<List<SupportLogDto>> GetEmployeeSupportHistoryAsync(int employeeId)
    {
        var logs = await _context.SupportActivityLogs
            .Include(s => s.ActivityType)
            .Include(s => s.Product)
            .Include(s => s.Client)
            .Where(s => s.EmployeeId == employeeId && s.EndTime != null)
            .OrderByDescending(s => s.StartTime)
            .ToListAsync();

        return logs.Select(MapToDto).ToList();
    }

    public async Task<List<DemoFollowUpDto>> GetMyPendingDemoFollowUpsAsync(int employeeId)
    {
        var items = await _context.DemoFollowUps
            .Include(d => d.Employee)
            .Include(d => d.Product)
            .Include(d => d.Client)
            .Where(d => d.EmployeeId == employeeId && d.Status == DemoFollowUpStatus.Pending)
            .OrderBy(d => d.FollowUpDate)
            .ToListAsync();

        return items.Select(MapDemoFollowUpToDto).ToList();
    }

    public async Task CompleteDemoFollowUpAsync(int followUpId, int employeeId)
    {
        var item = await _context.DemoFollowUps
            .FirstOrDefaultAsync(d => d.Id == followUpId && d.EmployeeId == employeeId);

        if (item == null)
            throw new KeyNotFoundException("Demo follow-up item not found.");

        item.Status = DemoFollowUpStatus.Completed;
        item.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<SupportLogDto?> GetActiveSupportAsync(int employeeId)
    {
        var log = await _context.SupportActivityLogs
            .Include(s => s.ActivityType)
            .Include(s => s.Product)
            .Include(s => s.Client)
            .FirstOrDefaultAsync(s => s.EmployeeId == employeeId && s.EndTime == null);

        return log != null ? MapToDto(log) : null;
    }

    private async Task<SupportLogDto?> GetByIdAsync(int id)
    {
        var log = await _context.SupportActivityLogs
            .Include(s => s.ActivityType)
            .Include(s => s.Product)
            .Include(s => s.Client)
            .FirstOrDefaultAsync(s => s.Id == id);

        return log != null ? MapToDto(log) : null;
    }

    public async Task<DemoFollowUpDto?> GetDemoFollowUpByIdAsync(int id)
    {
        var item = await _context.DemoFollowUps
            .Include(d => d.Employee)
            .Include(d => d.Product)
            .Include(d => d.Client)
            .FirstOrDefaultAsync(d => d.Id == id);

        return item != null ? MapDemoFollowUpToDto(item) : null;
    }

    private static SupportLogDto MapToDto(SupportActivityLog s)
    {
        var duration = s.EndTime.HasValue
            ? (s.EndTime.Value - s.StartTime).ToString(@"hh\:mm\:ss")
            : null;

        return new SupportLogDto
        {
            Id = s.Id,
            EmployeeId = s.EmployeeId,
            ActivityTypeId = s.ActivityTypeId,
            ActivityTypeName = s.ActivityType?.Name ?? string.Empty,
            HeldTaskId = s.HeldTaskId,
            ProductId = s.ProductId,
            ProductName = s.Product != null ? s.Product.Name : s.CustomProductName,
            ClientId = s.ClientId,
            ClientCompanyName = s.Client != null ? s.Client.CompanyName : s.CustomClientName,
            Remarks = s.Remarks,
            StartTime = DateTime.SpecifyKind(s.StartTime, DateTimeKind.Utc),
            EndTime = s.EndTime.HasValue ? DateTime.SpecifyKind(s.EndTime.Value, DateTimeKind.Utc) : null,
            Duration = duration
        };
    }

    private static DemoFollowUpDto MapDemoFollowUpToDto(DemoFollowUp d) => new()
    {
        Id = d.Id,
        EmployeeId = d.EmployeeId,
        EmployeeName = d.Employee?.Name ?? string.Empty,
        SupportActivityLogId = d.SupportActivityLogId,
        ProductId = d.ProductId,
        ProductName = d.Product != null ? d.Product.Name : (d.CustomProductName ?? string.Empty),
        ClientId = d.ClientId,
        ClientCompanyName = d.Client != null ? d.Client.CompanyName : (d.CustomClientName ?? string.Empty),
        ReviewRemarks = d.ReviewRemarks,
        FollowUpDate = d.FollowUpDate,
        Status = d.Status.ToString(),
        ReminderSentAt = d.ReminderSentAt,
        CompletedAt = d.CompletedAt,
        CreatedAt = d.CreatedAt
    };
}
