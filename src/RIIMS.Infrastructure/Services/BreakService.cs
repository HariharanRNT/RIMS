using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Break;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class BreakService : IBreakService
{
    private readonly RiimsDbContext _context;

    public BreakService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<BreakLogDto> StartBreakAsync(int employeeId, StartBreakRequest request)
    {
        // 1. Check if employee already has an active break or support activity
        var existingActive = await _context.BreakLogs
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.EndTime == null);

        if (existingActive != null)
            throw new InvalidOperationException("You already have an active break session.");

        var activeSupport = await _context.SupportActivityLogs
            .AnyAsync(s => s.EmployeeId == employeeId && s.EndTime == null);

        if (activeSupport)
            throw new InvalidOperationException("Cannot start a break while a support activity is active. Please stop your support activity first.");

        var now = DateTime.UtcNow;

        // 2. Auto-hold active task (Business Rule #2)
        int? heldTaskId = null;
        var runningTask = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running);

        if (runningTask != null)
        {
            heldTaskId = runningTask.Id;
            runningTask.Status = TaskStatusEnum.OnHold;

            var openTimeLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == runningTask.Id && tl.EndTime == null);

            if (openTimeLog != null)
            {
                openTimeLog.EndTime = now;
            }

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = runningTask.Id,
                StartTime = openTimeLog?.StartTime ?? now,
                EndTime = now,
                Status = "OnHold",
                Remarks = "Task paused for break"
            });
        }

        // 3. Create BreakLog
        var breakLog = new BreakLog
        {
            EmployeeId = employeeId,
            BreakTypeId = request.BreakTypeId,
            HeldTaskId = heldTaskId,
            StartTime = now
        };

        _context.BreakLogs.Add(breakLog);

        // 4. Log to ActivityTimeline
        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Break",
            RefTable = "BreakLogs",
            RefId = breakLog.Id,
            StartTime = now,
            Status = "Active",
            Remarks = "Started break"
        });

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(breakLog.Id))!;
    }

    public async Task<BreakLogDto> StopBreakAsync(int breakLogId, int employeeId)
    {
        var breakLog = await _context.BreakLogs
            .FirstOrDefaultAsync(b => b.Id == breakLogId && b.EmployeeId == employeeId && b.EndTime == null);

        if (breakLog == null)
            throw new KeyNotFoundException("Active break session not found.");

        var now = DateTime.UtcNow;
        breakLog.EndTime = now;

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Break",
            RefTable = "BreakLogs",
            RefId = breakLog.Id,
            StartTime = breakLog.StartTime,
            EndTime = now,
            Status = "Stopped",
            Remarks = "Stopped break"
        });

        // Auto-resume held task (Business Rule #3)
        if (breakLog.HeldTaskId.HasValue)
        {
            var heldTask = await _context.WorkTasks.FindAsync(breakLog.HeldTaskId.Value);
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
                    Remarks = "Auto-resumed task after break"
                });
            }
        }

        await _context.SaveChangesAsync();
        return (await GetByIdAsync(breakLogId))!;
    }

    public async Task<BreakLogDto?> GetActiveBreakAsync(int employeeId)
    {
        var breakLog = await _context.BreakLogs
            .Include(b => b.BreakType)
            .FirstOrDefaultAsync(b => b.EmployeeId == employeeId && b.EndTime == null);

        return breakLog != null ? MapToDto(breakLog) : null;
    }

    private async Task<BreakLogDto?> GetByIdAsync(int id)
    {
        var b = await _context.BreakLogs
            .Include(bl => bl.BreakType)
            .FirstOrDefaultAsync(bl => bl.Id == id);

        return b != null ? MapToDto(b) : null;
    }

    private static BreakLogDto MapToDto(BreakLog b)
    {
        var duration = b.EndTime.HasValue
            ? (b.EndTime.Value - b.StartTime).ToString(@"hh\:mm\:ss")
            : null;

        return new BreakLogDto
        {
            Id = b.Id,
            EmployeeId = b.EmployeeId,
            BreakTypeId = b.BreakTypeId,
            BreakTypeName = b.BreakType.Name,
            HeldTaskId = b.HeldTaskId,
            StartTime = DateTime.SpecifyKind(b.StartTime, DateTimeKind.Utc),
            EndTime = b.EndTime.HasValue ? DateTime.SpecifyKind(b.EndTime.Value, DateTimeKind.Utc) : null,
            Duration = duration
        };
    }
}
