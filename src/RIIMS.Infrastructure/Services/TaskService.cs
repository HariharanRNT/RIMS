using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Task;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Infrastructure.Services;

public class TaskService : ITaskService
{
    private readonly RiimsDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IIdleTimeService _idleTimeService;

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

    private static DateTime GetTodayIst()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone).Date;
    }

    public TaskService(RiimsDbContext context, IEmailService emailService, IIdleTimeService idleTimeService)
    {
        _context = context;
        _emailService = emailService;
        _idleTimeService = idleTimeService;
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

        // 1. Auto-hold any currently running task for this employee
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

            var holdRemarksText = !string.IsNullOrWhiteSpace(request.HoldRemarks)
                ? request.HoldRemarks.Trim()
                : "Auto-held by starting new task";

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = currentRunningTask.Id,
                StartTime = openTimeLog?.StartTime ?? now,
                EndTime = now,
                Status = "OnHold",
                Remarks = holdRemarksText
            });

            var performer = await _context.Employees.FindAsync(employeeId);
            _context.TaskTimelineEvents.Add(new TaskTimelineEvent
            {
                WorkTaskId = currentRunningTask.Id,
                EventType = "Held",
                Timestamp = now,
                PerformedByEmployeeId = employeeId,
                PerformedByName = performer?.Name ?? "Employee",
                PerformedByRole = "Employee",
                Remarks = holdRemarksText
            });
        }

        // 2. Resolve ProductId / CustomProductName
        int? targetProductId = null;
        string? targetCustomProdName = null;
        if (request.ProductId.HasValue && request.ProductId > 0)
        {
            targetProductId = request.ProductId;
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomProductName))
        {
            targetCustomProdName = request.CustomProductName.Trim();
        }
        else
        {
            throw new InvalidOperationException("Product selection or custom product name is required.");
        }

        // 3. Resolve ClientId / CustomClientName
        int? targetClientId = null;
        string? targetCustomClientName = null;
        if (request.ClientId.HasValue && request.ClientId > 0)
        {
            targetClientId = request.ClientId;
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomClientName))
        {
            targetCustomClientName = request.CustomClientName.Trim();
        }
        else
        {
            throw new InvalidOperationException("Client selection or custom client name is required.");
        }

        // 4. Create new self-assigned task
        var emp = await _context.Employees.FindAsync(employeeId);

        var task = new WorkTask
        {
            EmployeeId = employeeId,
            ProductId = targetProductId,
            CustomProductName = targetCustomProdName,
            ClientId = targetClientId,
            CustomClientName = targetCustomClientName,
            ModuleName = request.ModuleName.Trim(),
            Description = request.Description.Trim(),
            Status = TaskStatusEnum.Running,
            Priority = request.Priority,
            PlannedStart = request.PlannedStart,
            DueDate = request.DueDate,
            PlannedDurationMinutes = request.PlannedDurationMinutes,
            Instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim(),
            AssignedByEmployeeId = null,
            AssignerType = TaskAssignerType.Employee
        };

        _context.WorkTasks.Add(task);
        await _context.SaveChangesAsync();

        // 5. Open TaskTimeLog
        var timeLog = new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = now
        };
        _context.TaskTimeLogs.Add(timeLog);

        var startRemarksText = !string.IsNullOrWhiteSpace(request.Remarks)
            ? request.Remarks.Trim()
            : $"Started self-task: {task.ModuleName}";

        // 6. Log timeline audit events
        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Created",
            Timestamp = now,
            PerformedByEmployeeId = employeeId,
            PerformedByName = emp?.Name ?? "Employee",
            PerformedByRole = "Employee",
            Remarks = "Task created by employee"
        });

        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Started",
            Timestamp = now,
            PerformedByEmployeeId = employeeId,
            PerformedByName = emp?.Name ?? "Employee",
            PerformedByRole = "Employee",
            Remarks = startRemarksText
        });

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = now,
            Status = "Running",
            Remarks = startRemarksText
        });

        await _idleTimeService.OnActivityStartingAsync(employeeId, now, "Task");
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(task.Id))!;
    }

    public async Task<TaskDto> AssignTaskAsync(int currentUserId, string currentUserRole, AssignTaskRequest request)
    {
        var targetEmployee = await _context.Employees
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e => e.Id == request.EmployeeId && e.IsActive);

        if (targetEmployee == null)
            throw new KeyNotFoundException("Target employee not found or inactive.");

        var assignerEmployee = await _context.Employees.FindAsync(currentUserId);
        var assignerName = assignerEmployee?.Name ?? (currentUserRole == "Admin" ? "System Admin" : "Manager");

        // Permission Rule #3 & #10:
        // Admin: Can assign tasks to any employee.
        // Reporting Person: Can assign tasks ONLY to employees reporting directly to them.
        if (currentUserRole != "Admin")
        {
            if (targetEmployee.Id == currentUserId)
            {
                throw new UnauthorizedAccessException("You cannot assign a team task to yourself. Please use the self-task section.");
            }

            if (targetEmployee.ReportingPersonId != currentUserId)
            {
                throw new UnauthorizedAccessException("You are only authorized to assign tasks to employees reporting directly to you.");
            }
        }

        // Resolve Product
        int? targetProductId = null;
        string? targetCustomProdName = null;
        if (request.ProductId.HasValue && request.ProductId > 0)
        {
            targetProductId = request.ProductId;
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomProductName))
        {
            targetCustomProdName = request.CustomProductName.Trim();
        }
        else
        {
            throw new InvalidOperationException("Product selection or custom product name is required.");
        }

        // Resolve Client
        int? targetClientId = null;
        string? targetCustomClientName = null;
        if (request.ClientId.HasValue && request.ClientId > 0)
        {
            targetClientId = request.ClientId;
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomClientName))
        {
            targetCustomClientName = request.CustomClientName.Trim();
        }
        else
        {
            throw new InvalidOperationException("Client selection or custom client name is required.");
        }

        var assignerType = currentUserRole == "Admin" ? TaskAssignerType.Admin : TaskAssignerType.ReportingPerson;
        var now = DateTime.UtcNow;

        var task = new WorkTask
        {
            EmployeeId = request.EmployeeId,
            ProductId = targetProductId,
            CustomProductName = targetCustomProdName,
            ClientId = targetClientId,
            CustomClientName = targetCustomClientName,
            ModuleName = request.ModuleName.Trim(),
            Description = request.Description.Trim(),
            Status = TaskStatusEnum.Assigned,
            Priority = request.Priority,
            AssignedByEmployeeId = currentUserId,
            AssignerType = assignerType,
            PlannedStart = request.PlannedStart,
            DueDate = request.DueDate,
            PlannedDurationMinutes = request.PlannedDurationMinutes,
            Instructions = request.Instructions?.Trim()
        };

        _context.WorkTasks.Add(task);
        await _context.SaveChangesAsync();

        // Audit events: Created & Assigned
        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Created",
            Timestamp = now,
            PerformedByEmployeeId = currentUserId,
            PerformedByName = assignerName,
            PerformedByRole = currentUserRole,
            Remarks = $"Task created by {assignerName} ({currentUserRole})"
        });

        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Assigned",
            Timestamp = now,
            PerformedByEmployeeId = currentUserId,
            PerformedByName = assignerName,
            PerformedByRole = currentUserRole,
            Remarks = $"Task assigned to {targetEmployee.Name} (ID: {targetEmployee.EmployeeCode}) by {assignerName}"
        });

        await _context.SaveChangesAsync();

        // Send Task Assignment Email Notification
        try
        {
            if (!string.IsNullOrWhiteSpace(targetEmployee.Email))
            {
                string? ccEmail = null;
                // Rule 1 & Rule 2:
                // Admin assigns: TO = employee, CC = reporting person (if exists)
                // Reporting Person assigns: TO = employee, CC = None
                if (assignerType == TaskAssignerType.Admin && targetEmployee.ReportingPersonId.HasValue)
                {
                    var reportingPerson = await _context.Employees
                        .FirstOrDefaultAsync(e => e.Id == targetEmployee.ReportingPersonId.Value && e.IsActive);
                    if (reportingPerson != null && !string.IsNullOrWhiteSpace(reportingPerson.Email))
                    {
                        ccEmail = reportingPerson.Email.Trim();
                    }
                }

                // Resolve Product Name for email
                string productName = targetCustomProdName ?? "N/A";
                if (targetProductId.HasValue)
                {
                    var prod = await _context.Products.FindAsync(targetProductId.Value);
                    if (prod != null) productName = prod.Name;
                }

                // Resolve Client Name for email
                string clientName = targetCustomClientName ?? "N/A";
                if (targetClientId.HasValue)
                {
                    var client = await _context.Clients.FindAsync(targetClientId.Value);
                    if (client != null) clientName = client.CompanyName;
                }

                var durationMins = request.PlannedDurationMinutes ?? 0;
                var durationText = durationMins > 0 
                    ? $"{durationMins / 60}h {durationMins % 60}m" 
                    : "Not Specified";

                var emailSubject = $"[RIIMS] New Task Assigned: {task.ModuleName}";
                var emailBody = $@"
<div style=""font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5E7EB; border-radius: 12px; background-color: #FFFFFF;"">
  <div style=""background: #6366F1; padding: 16px; border-radius: 8px; color: #FFFFFF; text-align: center; margin-bottom: 20px;"">
    <h2 style=""margin: 0; font-size: 1.25rem; font-weight: 700;"">Work Task Assignment Notification</h2>
  </div>
  
  <p style=""color: #111827; font-size: 0.95rem;"">Dear <strong>{targetEmployee.Name}</strong>,</p>
  <p style=""color: #374151; font-size: 0.9rem;"">A new work task has been assigned to you in RIMS by <strong>{assignerName}</strong>.</p>
  
  <table style=""width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.875rem;"">
    <tr style=""background-color: #F9FAFB;"">
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563; width: 35%;"">Task Title</td>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827; font-weight: 600;"">{task.ModuleName}</td>
    </tr>
    <tr>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;"">Product</td>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;"">{productName}</td>
    </tr>
    <tr style=""background-color: #F9FAFB;"">
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;"">Client</td>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;"">{clientName}</td>
    </tr>
    <tr>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;"">Priority</td>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;"">{task.Priority}</td>
    </tr>
    <tr style=""background-color: #F9FAFB;"">
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;"">Planned Duration</td>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;"">{durationText}</td>
    </tr>
    {(task.PlannedStart.HasValue ? $"<tr><td style=\"padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;\">Planned Start</td><td style=\"padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;\">{task.PlannedStart.Value.ToString("dd-MMM-yyyy", System.Globalization.CultureInfo.InvariantCulture)}</td></tr>" : "")}
    {(task.DueDate.HasValue ? $"<tr style=\"background-color: #F9FAFB;\"><td style=\"padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;\">Due Date</td><td style=\"padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;\">{task.DueDate.Value.ToString("dd-MMM-yyyy", System.Globalization.CultureInfo.InvariantCulture)}</td></tr>" : "")}
    <tr>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;"">Description</td>
      <td style=""padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;"">{task.Description}</td>
    </tr>
    {(!string.IsNullOrWhiteSpace(task.Instructions) ? $"<tr style=\"background-color: #F9FAFB;\"><td style=\"padding: 10px 12px; border: 1px solid #E5E7EB; font-weight: 600; color: #4B5563;\">Instructions</td><td style=\"padding: 10px 12px; border: 1px solid #E5E7EB; color: #111827;\">{task.Instructions}</td></tr>" : "")}
  </table>

  <p style=""font-size: 0.85rem; color: #6B7280;"">Please log in to your RIMS portal to start working on this task.</p>
  <div style=""border-top: 1px solid #E5E7EB; margin-top: 20px; padding-top: 12px; font-size: 0.75rem; color: #9CA3AF; text-align: center;"">
    RIMS Notification Engine &bull; Assigned by {assignerName} ({currentUserRole})
  </div>
</div>";

                await _emailService.SendEmailAsync(targetEmployee.Email.Trim(), emailSubject, emailBody, ccEmail);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TaskService] Email notification dispatch failed for Task ID {task.Id}: {ex.Message}");
        }

        return (await GetByIdAsync(task.Id))!;
    }

    public async Task<TaskDto> StartAssignedTaskAsync(int taskId, int employeeId, StartAssignedTaskRequest? request = null)
    {
        await EnsureNoActiveBreakOrSupportAsync(employeeId, "start assigned task");

        var task = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.Id == taskId && t.EmployeeId == employeeId);

        if (task == null)
            throw new KeyNotFoundException("Assigned task not found.");

        if (task.Status != TaskStatusEnum.Assigned && task.Status != TaskStatusEnum.NotStarted && task.Status != TaskStatusEnum.OnHold)
            throw new InvalidOperationException($"Task cannot be started from current status: {task.Status}");

        var now = DateTime.UtcNow;

        // Auto-hold any other running task for this employee
        var currentRunningTask = await _context.WorkTasks
            .FirstOrDefaultAsync(t => t.EmployeeId == employeeId && t.Status == TaskStatusEnum.Running && t.Id != taskId);

        if (currentRunningTask != null)
        {
            currentRunningTask.Status = TaskStatusEnum.OnHold;
            var openTimeLog = await _context.TaskTimeLogs
                .FirstOrDefaultAsync(tl => tl.TaskId == currentRunningTask.Id && tl.EndTime == null);

            if (openTimeLog != null) openTimeLog.EndTime = now;

            var holdRemarksText = !string.IsNullOrWhiteSpace(request?.HoldRemarks)
                ? request.HoldRemarks.Trim()
                : "Auto-held by starting assigned task";

            var performer = await _context.Employees.FindAsync(employeeId);
            _context.TaskTimelineEvents.Add(new TaskTimelineEvent
            {
                WorkTaskId = currentRunningTask.Id,
                EventType = "Held",
                Timestamp = now,
                PerformedByEmployeeId = employeeId,
                PerformedByName = performer?.Name ?? "Employee",
                PerformedByRole = "Employee",
                Remarks = holdRemarksText
            });

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = currentRunningTask.Id,
                StartTime = openTimeLog?.StartTime ?? now,
                EndTime = now,
                Status = "OnHold",
                Remarks = holdRemarksText
            });
        }

        task.Status = TaskStatusEnum.Running;

        // Open TaskTimeLog
        _context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = now
        });

        var startRemarksText = !string.IsNullOrWhiteSpace(request?.Remarks)
            ? request.Remarks.Trim()
            : $"Started assigned task: {task.ModuleName}";

        var emp = await _context.Employees.FindAsync(employeeId);
        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Started",
            Timestamp = now,
            PerformedByEmployeeId = employeeId,
            PerformedByName = emp?.Name ?? "Employee",
            PerformedByRole = "Employee",
            Remarks = startRemarksText
        });

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = now,
            Status = "Running",
            Remarks = startRemarksText
        });

        await _idleTimeService.OnActivityStartingAsync(employeeId, now, "Task");
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(task.Id))!;
    }

    public async Task HoldTaskAsync(int taskId, int employeeId, TaskActionRequest? request = null)
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

        var holdRemarksText = !string.IsNullOrWhiteSpace(request?.Remarks)
            ? request.Remarks.Trim()
            : "Task put on hold";

        var emp = await _context.Employees.FindAsync(employeeId);
        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Held",
            Timestamp = now,
            PerformedByEmployeeId = employeeId,
            PerformedByName = emp?.Name ?? "Employee",
            PerformedByRole = "Employee",
            Remarks = holdRemarksText
        });

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = openTimeLog?.StartTime ?? now,
            EndTime = now,
            Status = "OnHold",
            Remarks = holdRemarksText
        });

        await _context.SaveChangesAsync();
        await _idleTimeService.OnActivityEndingAsync(employeeId, now, "Task");
    }

    public async Task ResumeTaskAsync(int taskId, int employeeId, TaskActionRequest? request = null)
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

            var autoHoldRemarks = !string.IsNullOrWhiteSpace(request?.HoldRemarks)
                ? request.HoldRemarks.Trim()
                : "Auto-held by resuming another task";

            var performer = await _context.Employees.FindAsync(employeeId);
            _context.TaskTimelineEvents.Add(new TaskTimelineEvent
            {
                WorkTaskId = otherRunning.Id,
                EventType = "Held",
                Timestamp = now,
                PerformedByEmployeeId = employeeId,
                PerformedByName = performer?.Name ?? "Employee",
                PerformedByRole = "Employee",
                Remarks = autoHoldRemarks
            });

            _context.ActivityTimelines.Add(new ActivityTimeline
            {
                EmployeeId = employeeId,
                ActivityType = "Task",
                RefTable = "Tasks",
                RefId = otherRunning.Id,
                StartTime = openLog?.StartTime ?? now,
                EndTime = now,
                Status = "OnHold",
                Remarks = autoHoldRemarks
            });
        }

        task.Status = TaskStatusEnum.Running;

        _context.TaskTimeLogs.Add(new TaskTimeLog
        {
            TaskId = task.Id,
            StartTime = now
        });

        var resumeRemarksText = !string.IsNullOrWhiteSpace(request?.Remarks)
            ? request.Remarks.Trim()
            : "Task resumed";

        var emp = await _context.Employees.FindAsync(employeeId);
        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Resumed",
            Timestamp = now,
            PerformedByEmployeeId = employeeId,
            PerformedByName = emp?.Name ?? "Employee",
            PerformedByRole = "Employee",
            Remarks = resumeRemarksText
        });

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = now,
            Status = "Resumed",
            Remarks = resumeRemarksText
        });

        await _idleTimeService.OnActivityStartingAsync(employeeId, now, "Task");
        await _context.SaveChangesAsync();
    }

    public async Task CompleteTaskAsync(int taskId, int employeeId, TaskActionRequest? request = null)
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

        var completeRemarksText = !string.IsNullOrWhiteSpace(request?.Remarks)
            ? request.Remarks.Trim()
            : "Task completed";

        var emp = await _context.Employees.FindAsync(employeeId);
        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Completed",
            Timestamp = now,
            PerformedByEmployeeId = employeeId,
            PerformedByName = emp?.Name ?? "Employee",
            PerformedByRole = "Employee",
            Remarks = completeRemarksText
        });

        _context.ActivityTimelines.Add(new ActivityTimeline
        {
            EmployeeId = employeeId,
            ActivityType = "Task",
            RefTable = "Tasks",
            RefId = task.Id,
            StartTime = openTimeLog?.StartTime ?? now,
            EndTime = now,
            Status = "Completed",
            Remarks = completeRemarksText
        });

        await _context.SaveChangesAsync();
        await _idleTimeService.OnActivityEndingAsync(employeeId, now, "Task");
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
            ProductName = task.Product != null ? task.Product.Name : (task.CustomProductName ?? string.Empty),
            ClientId = task.ClientId,
            ClientCompanyName = task.Client != null ? task.Client.CompanyName : (task.CustomClientName ?? string.Empty),
            ModuleName = task.ModuleName,
            Description = task.Description,
            Status = task.Status.ToString(),
            StartTime = openTimeLog?.StartTime != null ? DateTime.SpecifyKind(openTimeLog.StartTime, DateTimeKind.Utc) : null,
            AccumulatedSeconds = Math.Max(0, accumulatedSeconds),
            PlannedDurationMinutes = task.PlannedDurationMinutes,
            Reminder30Fired = task.Reminder30Fired,
            Reminder15Fired = task.Reminder15Fired,
            ReminderCompletionFired = task.ReminderCompletionFired
        };
    }

    public async Task<List<TaskDto>> GetTaskHistoryAsync(int employeeId, DateTime? from = null, DateTime? to = null)
    {
        var query = _context.WorkTasks
            .Include(t => t.Employee).ThenInclude(e => e.Department)
            .Include(t => t.AssignedByEmployee)
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Include(t => t.TimelineEvents)
            .Where(t => t.EmployeeId == employeeId)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(t => t.CreatedAt >= from.Value.Date);

        if (to.HasValue)
            query = query.Where(t => t.CreatedAt <= to.Value.Date.AddDays(1).AddTicks(-1));

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return tasks.Select(MapToDto).ToList();
    }

    public async Task<List<TaskDto>> GetAssignedTasksForEmployeeAsync(int employeeId)
    {
        var tasks = await _context.WorkTasks
            .Include(t => t.Employee).ThenInclude(e => e.Department)
            .Include(t => t.AssignedByEmployee)
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Include(t => t.TimelineEvents)
            .Where(t => t.EmployeeId == employeeId && t.AssignedByEmployeeId != null && t.Status != TaskStatusEnum.Completed && t.Status != TaskStatusEnum.Cancelled)
            .OrderByDescending(t => t.Priority)
            .ThenBy(t => t.DueDate)
            .ToListAsync();

        return tasks.Select(MapToDto).ToList();
    }

    public async Task<List<TeamEmployeeDto>> GetMyTeamEmployeesAsync(int currentUserId)
    {
        var currentEmp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == currentUserId);
        var isAdmin = currentEmp != null && (currentEmp.EmployeeCode == "EMP-001" || currentEmp.DesignationId == 1);

        List<Employee> reportees;
        if (isAdmin)
        {
            reportees = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Where(e => e.Id != currentUserId && e.IsActive)
                .OrderBy(e => e.Name)
                .ToListAsync();
        }
        else
        {
            reportees = await _context.Employees
                .Include(e => e.Department)
                .Include(e => e.Designation)
                .Where(e => e.ReportingPersonId == currentUserId && e.IsActive)
                .OrderBy(e => e.Name)
                .ToListAsync();
        }

        return reportees.Select(e => new TeamEmployeeDto
        {
            Id = e.Id,
            EmployeeCode = e.EmployeeCode,
            Name = e.Name,
            DepartmentName = e.Department?.Name ?? string.Empty,
            DesignationName = e.Designation?.Name ?? string.Empty
        }).ToList();
    }

    public async Task<PagedResult<TaskDto>> GetMyTeamTasksAsync(int currentUserId, TeamTaskQueryDto query)
    {
        var currentEmp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == currentUserId);
        var isAdmin = currentEmp != null && (currentEmp.EmployeeCode == "EMP-001" || currentEmp.DesignationId == 1);

        List<int> teamEmployeeIds;
        if (isAdmin)
        {
            teamEmployeeIds = await _context.Employees
                .AsNoTracking()
                .Where(e => e.Id != currentUserId && e.IsActive)
                .Select(e => e.Id)
                .ToListAsync();
        }
        else
        {
            teamEmployeeIds = await _context.Employees
                .AsNoTracking()
                .Where(e => e.ReportingPersonId == currentUserId && e.IsActive)
                .Select(e => e.Id)
                .ToListAsync();
        }

        var baseQuery = _context.WorkTasks
            .AsNoTracking()
            .Include(t => t.Employee).ThenInclude(e => e.Department)
            .Include(t => t.AssignedByEmployee)
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Include(t => t.TimelineEvents)
            .Where(t => teamEmployeeIds.Contains(t.EmployeeId) || t.AssignedByEmployeeId == currentUserId);

        // Security check on requested EmployeeId filter
        if (query.EmployeeId.HasValue)
        {
            if (teamEmployeeIds.Contains(query.EmployeeId.Value) || query.EmployeeId.Value == currentUserId)
            {
                baseQuery = baseQuery.Where(t => t.EmployeeId == query.EmployeeId.Value);
            }
            else
            {
                // Unauthorized employee filter request: return empty result set safely
                return new PagedResult<TaskDto>
                {
                    Items = new List<TaskDto>(),
                    TotalCount = 0,
                    Page = query.Page,
                    PageSize = query.PageSize
                };
            }
        }

        // Status Filter
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            if (Enum.TryParse<TaskStatusEnum>(query.Status, true, out var statusEnum))
            {
                baseQuery = baseQuery.Where(t => t.Status == statusEnum);
            }
        }

        // Priority Filter
        if (query.Priority.HasValue)
        {
            baseQuery = baseQuery.Where(t => t.Priority == query.Priority.Value);
        }

        // Date Range Filter
        if (query.FromDate.HasValue)
        {
            baseQuery = baseQuery.Where(t => t.CreatedAt >= query.FromDate.Value.Date);
        }
        if (query.ToDate.HasValue)
        {
            var endOfDay = query.ToDate.Value.Date.AddDays(1).AddTicks(-1);
            baseQuery = baseQuery.Where(t => t.CreatedAt <= endOfDay);
        }

        // Search Filter
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(t =>
                EF.Functions.Like(t.ModuleName, $"%{search}%") ||
                EF.Functions.Like(t.Description, $"%{search}%") ||
                (t.Product != null && EF.Functions.Like(t.Product.Name, $"%{search}%")) ||
                (t.CustomProductName != null && EF.Functions.Like(t.CustomProductName, $"%{search}%")) ||
                (t.Client != null && EF.Functions.Like(t.Client.CompanyName, $"%{search}%")) ||
                (t.CustomClientName != null && EF.Functions.Like(t.CustomClientName, $"%{search}%")) ||
                (t.Employee != null && EF.Functions.Like(t.Employee.Name, $"%{search}%")));
        }

        // Smart View Filter
        if (!string.IsNullOrWhiteSpace(query.SmartView))
        {
            var todayIst = GetTodayIst();
            switch (query.SmartView.ToLower().Trim())
            {
                case "overdue":
                    baseQuery = baseQuery.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date < todayIst && t.Status != TaskStatusEnum.Completed && t.Status != TaskStatusEnum.Cancelled);
                    break;
                case "due-today":
                    baseQuery = baseQuery.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date == todayIst && t.Status != TaskStatusEnum.Completed && t.Status != TaskStatusEnum.Cancelled);
                    break;
                case "high-priority":
                    baseQuery = baseQuery.Where(t => t.Priority == TaskPriority.High || t.Priority == TaskPriority.Urgent);
                    break;
                case "exceeded-duration":
                case "exceeded-estimate":
                    baseQuery = baseQuery.Where(t => t.PlannedDurationMinutes.HasValue && t.PlannedDurationMinutes.Value > 0);
                    break;
            }
        }

        // Sorting
        var isAsc = string.Equals(query.SortDirection, "asc", StringComparison.OrdinalIgnoreCase);
        switch (query.SortBy?.Trim().ToLower())
        {
            case "duedate":
                baseQuery = isAsc ? baseQuery.OrderBy(t => t.DueDate) : baseQuery.OrderByDescending(t => t.DueDate);
                break;
            case "priority":
                baseQuery = isAsc ? baseQuery.OrderBy(t => t.Priority) : baseQuery.OrderByDescending(t => t.Priority);
                break;
            case "status":
                baseQuery = isAsc ? baseQuery.OrderBy(t => t.Status) : baseQuery.OrderByDescending(t => t.Status);
                break;
            case "employeename":
                baseQuery = isAsc ? baseQuery.OrderBy(t => t.Employee.Name) : baseQuery.OrderByDescending(t => t.Employee.Name);
                break;
            case "createdat":
            default:
                baseQuery = isAsc ? baseQuery.OrderBy(t => t.CreatedAt) : baseQuery.OrderByDescending(t => t.CreatedAt);
                break;
        }

        var totalCount = await baseQuery.CountAsync();
        var items = await baseQuery
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        if ((query.IsExceededDuration.HasValue && query.IsExceededDuration.Value) || 
            string.Equals(query.SmartView, "exceeded-duration", StringComparison.OrdinalIgnoreCase) || 
            string.Equals(query.SmartView, "exceeded-estimate", StringComparison.OrdinalIgnoreCase))
        {
            dtos = dtos.Where(t => t.IsExceededDuration).ToList();
        }

        return new PagedResult<TaskDto>
        {
            Items = dtos,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<List<TaskDto>> GetAdminTasksAsync(int? employeeId = null, int? departmentId = null, int? managerId = null, string? status = null, DateTime? from = null, DateTime? to = null, bool? isOverdue = null, bool? isExceededDuration = null)
    {
        var query = _context.WorkTasks
            .Include(t => t.Employee).ThenInclude(e => e.Department)
            .Include(t => t.AssignedByEmployee)
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Include(t => t.TimelineEvents)
            .AsQueryable();

        if (employeeId.HasValue && employeeId > 0)
            query = query.Where(t => t.EmployeeId == employeeId.Value);

        if (departmentId.HasValue && departmentId > 0)
            query = query.Where(t => t.Employee.DepartmentId == departmentId.Value);

        if (managerId.HasValue && managerId > 0)
            query = query.Where(t => t.Employee.ReportingPersonId == managerId.Value || t.AssignedByEmployeeId == managerId.Value);

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<TaskStatusEnum>(status, true, out var parsedStatus))
            {
                query = query.Where(t => t.Status == parsedStatus);
            }
        }

        if (from.HasValue)
            query = query.Where(t => t.CreatedAt >= from.Value.Date);

        if (to.HasValue)
            query = query.Where(t => t.CreatedAt <= to.Value.Date.AddDays(1).AddTicks(-1));

        if (isOverdue.HasValue && isOverdue.Value)
        {
            var todayIst = GetTodayIst();
            query = query.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date < todayIst && t.Status != TaskStatusEnum.Completed && t.Status != TaskStatusEnum.Cancelled);
        }

        var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        var dtos = tasks.Select(MapToDto).ToList();
        if (isExceededDuration.HasValue && isExceededDuration.Value)
        {
            dtos = dtos.Where(t => t.IsExceededDuration).ToList();
        }
        return dtos;
    }

    public async Task<TaskDto> ReassignTaskAsync(int taskId, int currentUserId, string currentUserRole, ReassignTaskRequest request)
    {
        var task = await _context.WorkTasks
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        var newEmployee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == request.NewEmployeeId && e.IsActive);

        if (newEmployee == null)
            throw new KeyNotFoundException("New assignee employee not found or inactive.");

        var assignerEmployee = await _context.Employees.FindAsync(currentUserId);
        var assignerName = assignerEmployee?.Name ?? (currentUserRole == "Admin" ? "System Admin" : "Manager");

        // Rule #6:
        // Admin: can reassign any task.
        // Reporting Person: can reassign only within their reporting hierarchy or to themselves.
        if (currentUserRole != "Admin")
        {
            var isCurrentOwnerAllowed = task.Employee?.ReportingPersonId == currentUserId 
                || task.EmployeeId == currentUserId 
                || task.AssignedByEmployeeId == currentUserId;

            var isNewAssigneeAllowed = newEmployee.ReportingPersonId == currentUserId 
                || newEmployee.Id == currentUserId;

            if (!isCurrentOwnerAllowed || !isNewAssigneeAllowed)
            {
                throw new UnauthorizedAccessException("You are only authorized to reassign tasks within your reporting hierarchy or to yourself.");
            }
        }

        var oldEmployeeName = task.Employee?.Name ?? $"ID {task.EmployeeId}";
        task.EmployeeId = request.NewEmployeeId;
        task.Employee = newEmployee;
        task.Status = TaskStatusEnum.Assigned;

        // If task was running, close active time log
        var openLog = await _context.TaskTimeLogs
            .FirstOrDefaultAsync(tl => tl.TaskId == taskId && tl.EndTime == null);
        if (openLog != null)
        {
            openLog.EndTime = DateTime.UtcNow;
        }

        var now = DateTime.UtcNow;
        var timelineEvent = new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Reassigned",
            Timestamp = now,
            PerformedByEmployeeId = currentUserId,
            PerformedByName = assignerName,
            PerformedByRole = currentUserRole,
            Remarks = $"Reassigned from {oldEmployeeName} to {newEmployee.Name}. {request.Remarks?.Trim()}"
        };
        _context.TaskTimelineEvents.Add(timelineEvent);

        await _context.SaveChangesAsync();
        return (await GetByIdAsync(task.Id)) ?? MapToDto(task);
    }

    public async Task CancelTaskAsync(int taskId, int currentUserId, string currentUserRole, CancelTaskRequest request)
    {
        var task = await _context.WorkTasks
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        if (currentUserRole != "Admin")
        {
            if (task.Employee.ReportingPersonId != currentUserId && task.AssignedByEmployeeId != currentUserId)
            {
                throw new UnauthorizedAccessException("You are not authorized to cancel this task.");
            }
        }

        var now = DateTime.UtcNow;
        task.Status = TaskStatusEnum.Cancelled;

        var openLog = await _context.TaskTimeLogs
            .FirstOrDefaultAsync(tl => tl.TaskId == taskId && tl.EndTime == null);

        if (openLog != null) openLog.EndTime = now;

        var assignerEmployee = await _context.Employees.FindAsync(currentUserId);
        var assignerName = assignerEmployee?.Name ?? (currentUserRole == "Admin" ? "System Admin" : "Manager");

        _context.TaskTimelineEvents.Add(new TaskTimelineEvent
        {
            WorkTaskId = task.Id,
            EventType = "Cancelled",
            Timestamp = now,
            PerformedByEmployeeId = currentUserId,
            PerformedByName = assignerName,
            PerformedByRole = currentUserRole,
            Remarks = $"Task cancelled by {assignerName}. {request.Remarks?.Trim()}"
        });

        await _context.SaveChangesAsync();
    }

    public async Task<List<TaskTimelineEventDto>> GetTaskTimelineAsync(int taskId, int currentUserId, string currentUserRole)
    {
        var task = await _context.WorkTasks
            .Include(t => t.Employee)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            throw new KeyNotFoundException("Task not found.");

        if (currentUserRole != "Admin")
        {
            if (task.EmployeeId != currentUserId && task.Employee.ReportingPersonId != currentUserId && task.AssignedByEmployeeId != currentUserId)
            {
                throw new UnauthorizedAccessException("You are not authorized to view this task's timeline.");
            }
        }

        var events = await _context.TaskTimelineEvents
            .Where(e => e.WorkTaskId == taskId)
            .OrderBy(e => e.Timestamp)
            .ToListAsync();

        return events.Select(e => new TaskTimelineEventDto
        {
            Id = e.Id,
            WorkTaskId = e.WorkTaskId,
            EventType = e.EventType,
            Timestamp = DateTime.SpecifyKind(e.Timestamp, DateTimeKind.Utc),
            PerformedByEmployeeId = e.PerformedByEmployeeId,
            PerformedByName = e.PerformedByName,
            PerformedByRole = e.PerformedByRole,
            Remarks = e.Remarks
        }).ToList();
    }

    private async Task<TaskDto?> GetByIdAsync(int id)
    {
        var task = await _context.WorkTasks
            .AsNoTracking()
            .Include(t => t.Employee).ThenInclude(e => e.Department)
            .Include(t => t.AssignedByEmployee)
            .Include(t => t.Product)
            .Include(t => t.Client)
            .Include(t => t.TimeLogs)
            .Include(t => t.TimelineEvents)
            .FirstOrDefaultAsync(t => t.Id == id);

        return task != null ? MapToDto(task) : null;
    }

    private static TaskDto MapToDto(WorkTask t)
    {
        var totalSeconds = t.TimeLogs != null
            ? (int)t.TimeLogs.Sum(tl => ((tl.EndTime ?? DateTime.UtcNow) - tl.StartTime).TotalSeconds)
            : 0;

        var ts = TimeSpan.FromSeconds(totalSeconds);
        var duration = $"{((int)ts.TotalHours):D2}:{ts.Minutes:D2}:{ts.Seconds:D2}";
        var todayIst = GetTodayIst();
        var dueDateIst = t.DueDate.HasValue ? TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(t.DueDate.Value, DateTimeKind.Utc), IstTimeZone).Date : (DateTime?)null;
        var isOverdue = dueDateIst.HasValue && dueDateIst.Value < todayIst && t.Status != TaskStatusEnum.Completed && t.Status != TaskStatusEnum.Cancelled;
        var isExceededDuration = t.PlannedDurationMinutes.HasValue && t.PlannedDurationMinutes.Value > 0 && totalSeconds > (t.PlannedDurationMinutes.Value * 60);

        return new TaskDto
        {
            Id = t.Id,
            EmployeeId = t.EmployeeId,
            EmployeeName = t.Employee?.Name ?? string.Empty,
            EmployeeCode = t.Employee?.EmployeeCode ?? string.Empty,
            DepartmentName = t.Employee?.Department?.Name ?? string.Empty,
            ProductId = t.ProductId,
            ProductName = t.Product != null ? t.Product.Name : (t.CustomProductName ?? string.Empty),
            ProductCode = t.Product != null ? t.Product.Code : "CUSTOM",
            ClientId = t.ClientId,
            ClientCompanyName = t.Client != null ? t.Client.CompanyName : (t.CustomClientName ?? string.Empty),
            ModuleName = t.ModuleName,
            Description = t.Description,
            Status = t.Status.ToString(),
            Priority = t.Priority,
            AssignedByEmployeeId = t.AssignedByEmployeeId,
            AssignedByName = t.AssignedByEmployee?.Name ?? (t.AssignerType == TaskAssignerType.Admin ? "System Admin" : null),
            AssignerType = t.AssignerType,
            PlannedStart = t.PlannedStart.HasValue ? DateTime.SpecifyKind(t.PlannedStart.Value, DateTimeKind.Utc) : null,
            DueDate = t.DueDate.HasValue ? DateTime.SpecifyKind(t.DueDate.Value, DateTimeKind.Utc) : null,
            PlannedDurationMinutes = t.PlannedDurationMinutes,
            Instructions = t.Instructions,
            CreatedAt = DateTime.SpecifyKind(t.CreatedAt, DateTimeKind.Utc),
            UpdatedAt = DateTime.SpecifyKind(t.UpdatedAt, DateTimeKind.Utc),
            Duration = duration,
            TotalProductiveSeconds = Math.Max(0, totalSeconds),
            IsOverdue = isOverdue,
            IsExceededDuration = isExceededDuration,
            TimelineEvents = (t.TimelineEvents ?? Enumerable.Empty<TaskTimelineEvent>()).Select(e => new TaskTimelineEventDto
            {
                Id = e.Id,
                WorkTaskId = e.WorkTaskId,
                EventType = e.EventType,
                Timestamp = DateTime.SpecifyKind(e.Timestamp, DateTimeKind.Utc),
                PerformedByEmployeeId = e.PerformedByEmployeeId,
                PerformedByName = e.PerformedByName,
                PerformedByRole = e.PerformedByRole,
                Remarks = e.Remarks
            }).OrderBy(e => e.Timestamp).ToList()
        };
    }

    public async Task MarkReminderFiredAsync(int taskId, int employeeId, string milestone)
    {
        var task = await _context.WorkTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.EmployeeId == employeeId);
        if (task == null) return;

        var norm = milestone?.Trim().ToLowerInvariant() ?? string.Empty;
        if (norm == "30min" || norm == "30" || norm == "first" || norm == "reminder30")
        {
            task.Reminder30Fired = true;
        }
        else if (norm == "15min" || norm == "15" || norm == "second" || norm == "reminder15")
        {
            task.Reminder15Fired = true;
        }
        else if (norm == "completion" || norm == "complete" || norm == "0" || norm == "planned")
        {
            task.ReminderCompletionFired = true;
        }

        await _context.SaveChangesAsync();
    }
}
