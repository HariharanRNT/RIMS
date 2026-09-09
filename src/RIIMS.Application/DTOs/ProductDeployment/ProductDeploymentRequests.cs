using System.ComponentModel.DataAnnotations;

namespace RIIMS.Application.DTOs.ProductDeployment;

public class CreateProductDeploymentRequest
{
    [Required(ErrorMessage = "Product is required.")]
    public int ProductId { get; set; }

    [Required(ErrorMessage = "Client is required.")]
    public int ClientId { get; set; }

    [StringLength(200, ErrorMessage = "Issue title cannot exceed 200 characters.")]
    public string? Issue { get; set; }

    [Required(ErrorMessage = "Issue Date is required.")]
    public DateTime IssueDate { get; set; }

    [Required(ErrorMessage = "Raised By is required.")]
    public string RaisedBy { get; set; } = "Client";

    public string? ModeOfContact { get; set; }

    public string? ContactedPerson { get; set; }

    [Required(ErrorMessage = "Description is required.")]
    public string Description { get; set; } = string.Empty;

    public string? DevelopmentProcess { get; set; }

    public string? CurrentStatus { get; set; } = "New";

    public DateTime? DeliveryDate { get; set; }

    public string? Version { get; set; }

    public string? Remarks { get; set; }
}

public class UpdateProductDeploymentRequest
{
    [Required(ErrorMessage = "Product is required.")]
    public int ProductId { get; set; }

    [Required(ErrorMessage = "Client is required.")]
    public int ClientId { get; set; }

    [StringLength(200, ErrorMessage = "Issue title cannot exceed 200 characters.")]
    public string? Issue { get; set; }

    [Required(ErrorMessage = "Issue Date is required.")]
    public DateTime IssueDate { get; set; }

    [Required(ErrorMessage = "Raised By is required.")]
    public string RaisedBy { get; set; } = "Client";

    public string? ModeOfContact { get; set; }

    public string? ContactedPerson { get; set; }

    [Required(ErrorMessage = "Description is required.")]
    public string Description { get; set; } = string.Empty;

    public string? DevelopmentProcess { get; set; }

    [Required(ErrorMessage = "Current Status is required.")]
    public string CurrentStatus { get; set; } = "New";

    public DateTime? DeliveryDate { get; set; }

    public string? Version { get; set; }

    public string? Remarks { get; set; }
}

public class ChangeDeploymentStatusRequest
{
    [Required(ErrorMessage = "New Status is required.")]
    public string NewStatus { get; set; } = string.Empty;

    public string? Remarks { get; set; }

    public string? Version { get; set; }

    public DateTime? DeliveryDate { get; set; }
}
