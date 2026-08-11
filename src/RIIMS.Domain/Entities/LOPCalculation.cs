using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class LOPCalculation : BaseEntity
{
    public int EmployeeId { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal LOPDays { get; set; }
    public string Reason { get; set; } = string.Empty;

    // Navigation
    public Employee Employee { get; set; } = null!;
}
