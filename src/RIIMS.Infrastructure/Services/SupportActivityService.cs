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

        // Rule 6: All support activities require Remarks, ProductId, and ClientId before stopping
        if (string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException("Remarks are required to stop support activity.");
        if (request.ProductId <= 0)
            throw new InvalidOperationException("Product selection is required.");
        if (request.ClientId <= 0)
            throw new InvalidOperationException("Client selection is required.");

        var now = DateTime.UtcNow;
        log.EndTime = now;
        log.Remarks = request.Remarks;
        log.ProductId = request.ProductId;
        log.ClientId = request.ClientId;

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "SupportActivity",
            RefTable = "SupportActivityLogs",
            RefId = log.Id,
            StartTime = log.StartTime,
            EndTime = now,
            Status = "Stopped",
            Remarks = request.Remarks
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
        if (request.ProductId <= 0)
            throw new InvalidOperationException("Product selection is required.");
        if (request.ClientId <= 0)
            throw new InvalidOperationException("Client selection is required.");
        if (request.FollowUpDate == default)
            throw new InvalidOperationException("Follow-Up Date is required.");

        var now = DateTime.UtcNow;
        log.EndTime = now;
        log.Remarks = request.ReviewRemarks;
        log.ProductId = request.ProductId;
        log.ClientId = request.ClientId;

        // Create DemoFollowUp entity
        var followUp = new DemoFollowUp
        {
            EmployeeId = employeeId,
            SupportActivityLogId = log.Id,
            ProductId = request.ProductId,
            ClientId = request.ClientId,
            ReviewRemarks = request.ReviewRemarks,
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
                    Remarks = "Auto-resumed task after Demo support activity"
                });
            }
        }

        await _context.SaveChangesAsync();

        return (await GetDemoFollowUpByIdAsync(followUp.Id))!;
    }

    public async Task<List<DemoFollowUpDto>> GetMyPendingDemoFollowUpsAsync(int employeeId)
    {
        var list = await _context.DemoFollowUps
            .Include(d => d.Employee)
            .Include(d => d.Product)
            .Include(d => d.Client)
            .Where(d => d.EmployeeId == employeeId && (d.Status == DemoFollowUpStatus.Pending || d.Status == DemoFollowUpStatus.ReminderSent))
            .OrderBy(d => d.FollowUpDate)
            .ToListAsync();

        return list.Select(MapDemoFollowUpToDto).ToList();
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

    private async Task<DemoFollowUpDto?> GetDemoFollowUpByIdAsync(int id)
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
            ActivityTypeName = s.ActivityType.Name,
            HeldTaskId = s.HeldTaskId,
            ProductId = s.ProductId,
            ProductName = s.Product?.Name,
            ClientId = s.ClientId,
            ClientCompanyName = s.Client?.CompanyName,
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
        ProductName = d.Product?.Name ?? string.Empty,
        ClientId = d.ClientId,
        ClientCompanyName = d.Client?.CompanyName ?? string.Empty,
        ReviewRemarks = d.ReviewRemarks,
        FollowUpDate = d.FollowUpDate,
        Status = d.Status.ToString(),
        ReminderSentAt = d.ReminderSentAt,
        CompletedAt = d.CompletedAt,
        CreatedAt = d.CreatedAt
    };
}
