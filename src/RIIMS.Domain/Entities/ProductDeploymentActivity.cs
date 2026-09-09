namespace RIIMS.Domain.Entities;

public class ProductDeploymentActivity
{
    public int Id { get; set; }
    public int DeploymentId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string? PreviousStatus { get; set; }
    public string? NewStatus { get; set; }
    public string? Remarks { get; set; }
    public int ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ProductDeploymentHistory Deployment { get; set; } = null!;
    public Employee ChangedByEmployee { get; set; } = null!;
}
