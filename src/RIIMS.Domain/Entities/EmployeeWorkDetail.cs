using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;

namespace RIIMS.Domain.Entities;

public class EmployeeWorkDetail : BaseEntity
{
    public int EmployeeId { get; set; }
    public TimeSpan ShiftStart { get; set; }
    public TimeSpan ShiftEnd { get; set; }
    public WorkLocation WorkLocation { get; set; }
    public EmploymentType EmploymentType { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}
