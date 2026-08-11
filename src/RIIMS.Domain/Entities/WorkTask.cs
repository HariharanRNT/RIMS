using RIIMS.Domain.Common;
using TaskStatusEnum = RIIMS.Domain.Enums.TaskStatus;

namespace RIIMS.Domain.Entities;

/// <summary>
/// Named WorkTask to avoid conflict with System.Threading.Tasks.Task.
/// Maps to "Tasks" table in the database.
/// </summary>
public class WorkTask : BaseEntity
{
    public int EmployeeId { get; set; }
    public int ProductId { get; set; }
    public int ClientId { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TaskStatusEnum Status { get; set; } = TaskStatusEnum.Running;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public ICollection<TaskTimeLog> TimeLogs { get; set; } = new List<TaskTimeLog>();
    public ICollection<BreakLog> BreakLogs { get; set; } = new List<BreakLog>();
    public ICollection<SupportActivityLog> SupportActivityLogs { get; set; } = new List<SupportActivityLog>();
}
