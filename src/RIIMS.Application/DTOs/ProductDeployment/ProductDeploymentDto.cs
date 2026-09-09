namespace RIIMS.Application.DTOs.ProductDeployment;

public class ProductDeploymentDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductCode { get; set; } = string.Empty;

    public int ClientId { get; set; }
    public string ClientCompanyName { get; set; } = string.Empty;
    public string ClientCustomerName { get; set; } = string.Empty;

    public string Issue { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public string FormattedIssueDate => IssueDate.ToString("yyyy-MM-dd");

    public string RaisedBy { get; set; } = "Client";
    public string? ModeOfContact { get; set; }
    public string? ContactedPerson { get; set; }

    public string Description { get; set; } = string.Empty;
    public string DevelopmentProcess { get; set; } = string.Empty;
    public string CurrentStatus { get; set; } = "New";

    public bool MovedToTesting { get; set; }
    public int? MovedToTestingBy { get; set; }
    public string? MovedToTestingByName { get; set; }
    public DateTime? MovedToTestingAt { get; set; }
    public string? FormattedMovedToTestingAt => MovedToTestingAt?.ToString("yyyy-MM-dd HH:mm");

    public bool TestingCompleted { get; set; }
    public int? TestingCompletedBy { get; set; }
    public string? TestingCompletedByName { get; set; }
    public DateTime? TestingCompletedAt { get; set; }
    public string? FormattedTestingCompletedAt => TestingCompletedAt?.ToString("yyyy-MM-dd HH:mm");

    public DateTime? DeliveryDate { get; set; }
    public string? FormattedDeliveryDate => DeliveryDate?.ToString("yyyy-MM-dd");
    public int? DeliveredBy { get; set; }
    public string? DeliveredByName { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public string? Version { get; set; }

    public int? CreatedBy { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
    public string FormattedCreatedAt => CreatedAt.ToString("yyyy-MM-dd HH:mm");

    public int? ModifiedBy { get; set; }
    public string? ModifiedByName { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string FormattedUpdatedAt => UpdatedAt.ToString("yyyy-MM-dd HH:mm");

    public bool IsActive { get; set; } = true;
    public int ActivitiesCount { get; set; }
}
