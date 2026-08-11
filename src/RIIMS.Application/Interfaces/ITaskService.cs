using RIIMS.Application.DTOs.Task;

namespace RIIMS.Application.Interfaces;

public interface ITaskService
{
    Task<TaskDto> StartTaskAsync(int employeeId, StartTaskRequest request);
    Task HoldTaskAsync(int taskId, int employeeId);
    Task ResumeTaskAsync(int taskId, int employeeId);
    Task CompleteTaskAsync(int taskId, int employeeId);
    Task<ActiveTaskDto?> GetActiveTaskAsync(int employeeId);
    Task<List<TaskDto>> GetTaskHistoryAsync(int employeeId, DateTime? from = null, DateTime? to = null);
}
