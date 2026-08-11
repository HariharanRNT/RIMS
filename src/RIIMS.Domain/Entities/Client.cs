using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class Client : BaseEntity
{
    public string CompanyName { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? Pincode { get; set; }
    public string? PAN { get; set; }
    public string? GSTNo { get; set; }
    public string? HSN { get; set; }
    public string? CIN { get; set; }

    // Navigation
    public ICollection<ProductClientMapping> ProductClientMappings { get; set; } = new List<ProductClientMapping>();
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
    public ICollection<SupportActivityLog> SupportActivityLogs { get; set; } = new List<SupportActivityLog>();
}
