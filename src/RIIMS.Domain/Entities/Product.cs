using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;

    // Navigation
    public ICollection<ProductClientMapping> ProductClientMappings { get; set; } = new List<ProductClientMapping>();
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
    public ICollection<SupportActivityLog> SupportActivityLogs { get; set; } = new List<SupportActivityLog>();
}
