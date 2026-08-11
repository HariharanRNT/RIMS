using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class Department : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // Navigation
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
