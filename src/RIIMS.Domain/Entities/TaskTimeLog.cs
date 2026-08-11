using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class TaskTimeLog : BaseEntity
{
    public int TaskId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Navigation
    public WorkTask Task { get; set; } = null!;
}
