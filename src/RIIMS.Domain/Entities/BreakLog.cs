using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class BreakLog : BaseEntity
{
    public int EmployeeId { get; set; }
    public int BreakTypeId { get; set; }
    public int? HeldTaskId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public BreakType BreakType { get; set; } = null!;
    public WorkTask? HeldTask { get; set; }
}
