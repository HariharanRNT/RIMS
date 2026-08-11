using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class GraceTimeViolation : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan LoginTime { get; set; }
    public int MinutesLate { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
