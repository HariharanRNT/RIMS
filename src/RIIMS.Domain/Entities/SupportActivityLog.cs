using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class SupportActivityLog : BaseEntity
{
    public int EmployeeId { get; set; }
    public int ActivityTypeId { get; set; }
    public int? HeldTaskId { get; set; }
    public int? ProductId { get; set; }
    public int? ClientId { get; set; }
    public string? Remarks { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public SupportActivityType ActivityType { get; set; } = null!;
    public WorkTask? HeldTask { get; set; }
    public Product? Product { get; set; }
    public Client? Client { get; set; }
}
