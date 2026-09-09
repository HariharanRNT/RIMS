using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class ProductDeploymentHistory : BaseEntity
{
    public int ProductId { get; set; }
    public int ClientId { get; set; }
    public string Issue { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public string RaisedBy { get; set; } = "Client";
    public string? ModeOfContact { get; set; }
    public string? ContactedPerson { get; set; }
    public string Description { get; set; } = string.Empty;
    public string DevelopmentProcess { get; set; } = string.Empty;
    public string CurrentStatus { get; set; } = "New";

    public bool MovedToTesting { get; set; }
    public int? MovedToTestingBy { get; set; }
    public DateTime? MovedToTestingAt { get; set; }

    public bool TestingCompleted { get; set; }
    public int? TestingCompletedBy { get; set; }
    public DateTime? TestingCompletedAt { get; set; }

    public DateTime? DeliveryDate { get; set; }
    public int? DeliveredBy { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public string? Version { get; set; }

    public int? ModifiedBy { get; set; }
    public DateTime? ModifiedAt { get; set; }

    // Navigation
    public Product Product { get; set; } = null!;
    public Client Client { get; set; } = null!;
    public Employee? CreatedByEmployee { get; set; }
    public Employee? ModifiedByEmployee { get; set; }
    public Employee? MovedToTestingByEmployee { get; set; }
    public Employee? TestingCompletedByEmployee { get; set; }
    public Employee? DeliveredByEmployee { get; set; }

    public ICollection<ProductDeploymentActivity> Activities { get; set; } = new List<ProductDeploymentActivity>();
}
