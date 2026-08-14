using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RIIMS.Application.DTOs.Task;

namespace RIIMS.Application.Interfaces;

public interface ITaskService
{
    Task<TaskDto> StartTaskAsync(int employeeId, StartTaskRequest request);
    Task<TaskDto> AssignTaskAsync(int currentUserId, string currentUserRole, AssignTaskRequest request);
    Task<TaskDto> StartAssignedTaskAsync(int taskId, int employeeId);
    Task HoldTaskAsync(int taskId, int employeeId);
    Task ResumeTaskAsync(int taskId, int employeeId);
    Task CompleteTaskAsync(int taskId, int employeeId);
    Task<ActiveTaskDto?> GetActiveTaskAsync(int employeeId);
    Task<List<TaskDto>> GetTaskHistoryAsync(int employeeId, DateTime? from = null, DateTime? to = null);
    Task<List<TaskDto>> GetAssignedTasksForEmployeeAsync(int employeeId);
    Task<List<TeamEmployeeDto>> GetMyTeamEmployeesAsync(int currentUserId);
    Task<List<TaskDto>> GetMyTeamTasksAsync(int currentUserId);
    Task<List<TaskDto>> GetAdminTasksAsync(int? employeeId = null, int? departmentId = null, int? managerId = null, string? status = null, DateTime? from = null, DateTime? to = null, bool? isOverdue = null);
    Task<TaskDto> ReassignTaskAsync(int taskId, int currentUserId, string currentUserRole, ReassignTaskRequest request);
    Task CancelTaskAsync(int taskId, int currentUserId, string currentUserRole, CancelTaskRequest request);
    Task<List<TaskTimelineEventDto>> GetTaskTimelineAsync(int taskId, int currentUserId, string currentUserRole);
}
