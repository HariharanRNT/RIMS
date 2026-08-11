using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Task;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly RiimsDbContext _context;

    public TaskService(RiimsDbContext context)
    {
        _context = context;
    }

    private async Task EnsureNoActiveBreakOrSupportAsync(int employeeId, string actionName)
    {
        var activeBreak = await _context.BreakLogs
            .AnyAsync(b => b.EmployeeId == employeeId && b.EndTime == null);
        if (activeBreak)
            throw new InvalidOperationException($"Cannot {actionName} while a break is active. Please stop your break first.");

        var activeSupport = await _context.SupportActivityLogs
            .AnyAsync(s => s.EmployeeId == employeeId && s.EndTime == null);
        if (activeSupport)
            throw new InvalidOperationException($"Cannot {actionName} while a support activity is active. Please stop your support activity first.");
    }

    public async Task<TaskDto> StartTaskAsync(int employeeId, StartTaskRequest request)
    {
        await EnsureNoActiveBreakOrSupportAsync(employeeId, "start a task");
        var now = DateTime.UtcNow;

        // 1. Auto-hold any currently running task for this employee (Business Rule #2)
        var currentRunningTask = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running);

        if (currentRunningTask != null)
        {
            currentRunningTask.Status = TaskStatusEnum.OnHold;

            var openTimeLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == currentRunningTask.Id && tl.EndTime == null);

            if (openTimeLog != null)
            {
                openTimeLog.EndTime = now;
            }

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = currentRunningTask.Id,
                StartTime = openTimeLog?.StartTime ?? now,
                EndTime = now,
                Status = "OnHold",
                Remarks = "Auto-held by starting new task"
            });
        }

        // 2. Create new task
        var task = new WorkTask
        {
            EmployeeId = employeeId,
            ProductId = request.ProductId,
            ClientId = request.ClientId,
            ModuleName = request.ModuleName,
            Description = request.Description,
            Status = TaskStatusEnum.Running
        };

        _context.WorkTasks.Add(task);
        await _context.SaveChangesAsync();

        // 3. Open TaskTimeLog
        var timeLog = new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = now
        };
        _context.TaskTimeLogs.Add(timeLog);

        // 4. Log to ActivityTimeline
        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = now,
            Status = "Running",
            Remarks = $"Started task: {task.ModuleName}"
        });

        await _context.SaveChangesAsync();

        return (await GetByIdAsync(task.Id))!;
    }

    public async Task HoldTaskAsync(int taskId, int employeeId)
    {
        var task = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.EmployeeId == employeeId);

        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        if (task.Status != TaskStatusEnum.Running)
            return;

        var now = DateTime.UtcNow;
        task.Status = TaskStatusEnum.OnHold;

        var openTimeLog = await _context.TaskTimeLogs
            .FirstOrDefaultAsync(tl => tl.TaskId == taskId && tl.EndTime == null);

        if (openTimeLog != null)
        {
            openTimeLog.EndTime = now;
        }

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = openTimeLog?.StartTime ?? now,
            EndTime = now,
            Status = "OnHold",
            Remarks = "Task put on hold"
        });

        await _context.SaveChangesAsync();
    }

    public async Task ResumeTaskAsync(int taskId, int employeeId)
    {
        await EnsureNoActiveBreakOrSupportAsync(employeeId, "resume a task");
        var task = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.EmployeeId == employeeId);

        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        if (task.Status == TaskStatusEnum.Running)
            return;

        var now = DateTime.UtcNow;

        // Auto-hold any other running task
        var otherRunning = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running && t.Id != taskId);

        if (otherRunning != null)
        {
            otherRunning.Status = TaskStatusEnum.OnHold;
            var openLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == otherRunning.Id && tl.EndTime == null);
            if (openLog != null) openLog.EndTime = now;
        }

        task.Status = TaskStatusEnum.Running;

        _context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = now
        });

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = now,
            Status = "Resumed",
            Remarks = "Task resumed"
        });

        await _context.SaveChangesAsync();
    }

    public async Task CompleteTaskAsync(int taskId, int employeeId)
    {
        await EnsureNoActiveBreakOrSupportAsync(employeeId, "complete a task");
        var task = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.EmployeeId == employeeId);

        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        var now = DateTime.UtcNow;
        task.Status = TaskStatusEnum.Completed;

        var openTimeLog = await _context.TaskTimeLogs
            .FirstOrDefaultAsync(tl => tl.TaskId == taskId && tl.EndTime == null);

        if (openTimeLog != null)
        {
            openTimeLog.EndTime = now;
        }

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = openTimeLog?.StartTime ?? now,
            EndTime = now,
            Status = "Completed",
            Remarks = "Task completed"
        });

        await _context.SaveChangesAsync();
    }

    public async Task<ActiveTaskDto?> GetActiveTaskAsync(int employeeId)
    {
        var task = await _context.WorkTasks
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Where(t => t.EmployeeId == employeeId && (t.Status == TaskStatusEnum.Running || t.Status == TaskStatusEnum.OnHold))
            .OrderByDescending(t => t.Status == TaskStatusEnum.Running)
            .ThenByDescending(t => t.Id)
            .FirstOrDefaultAsync();

        if (task == null) return null;

        var openTimeLog = task.TimeLogs.FirstOrDefault(tl => tl.EndTime == null);

        var accumulatedSeconds = (int)task.TimeLogs
            .Where(tl => tl.EndTime != null)
            .Sum(tl => (tl.EndTime!.Value - tl.StartTime).TotalSeconds);

        return new ActiveTaskDto
        {
            TaskId = task.Id,
            ProductId = task.ProductId,
            ProductName = task.Product.Name,
            ClientId = task.ClientId,
            ClientCompanyName = task.Client.CompanyName,
            ModuleName = task.ModuleName,
            Description = task.Description,
            Status = task.Status.ToString(),
            StartTime = openTimeLog?.StartTime,
            AccumulatedSeconds = Math.Max(0, accumulatedSeconds)
        };
    }

    public async Task<List<TaskDto>> GetTaskHistoryAsync(int employeeId, DateTime? from = null, DateTime? to = null)
    {
        var query = _context.WorkTasks
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Where(t => t.EmployeeId == employeeId)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(t => t.CreatedAt >= from.Value.Date);

        if (to.HasValue)
            query = query.Where(t => t.CreatedAt <= to.Value.Date.AddDays(1).AddTicks(-1));

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();

        return tasks.Select(MapToDto).ToList();
    }

    private async Task<TaskDto?> GetByIdAsync(int id)
    {
        var task = await _context.WorkTasks
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .FirstOrDefaultAsync(t => t.Id == id);

        return task != null ? MapToDto(task) : null;
    }

    private static TaskDto MapToDto(WorkTask t)
    {
        var totalSeconds = t.TimeLogs
            .Sum(tl => ((tl.EndTime ?? DateTime.UtcNow) - tl.StartTime).TotalSeconds);

        var ts = TimeSpan.FromSeconds(totalSeconds);
        var duration = $"{((int)ts.TotalHours):D2}:{ts.Minutes:D2}:{ts.Seconds:D2}";

        return new TaskDto
        {
            Id = t.Id,
            EmployeeId = t.EmployeeId,
            ProductId = t.ProductId,
            ProductName = t.Product.Name,
            ProductCode = t.Product.Code,
            ClientId = t.ClientId,
            ClientCompanyName = t.Client.CompanyName,
            ModuleName = t.ModuleName,
            Description = t.Description,
            Status = t.Status.ToString(),
            CreatedAt = DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc),
            UpdatedAt = DateTime.SpecifyKind(t.UpdatedAt, DateTimeKind.Utc),
            Duration = duration
        };
    }
}
