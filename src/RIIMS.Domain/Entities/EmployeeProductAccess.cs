using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class EmployeeProductAccess : BaseEntity
{
    public int EmployeeId { get; set; }
    public int ProductId { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
