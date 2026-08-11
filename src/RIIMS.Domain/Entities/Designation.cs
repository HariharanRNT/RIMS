using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class Designation : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // Navigation
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}
