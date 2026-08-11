using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class SupportActivityType : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    // Navigation
    public ICollection<SupportActivityLog> SupportActivityLogs { get; set; } = new List<SupportActivityLog>();
}
