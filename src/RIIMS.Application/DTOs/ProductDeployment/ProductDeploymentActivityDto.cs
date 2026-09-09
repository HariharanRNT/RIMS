namespace RIIMS.Application.DTOs.ProductDeployment;

public class ProductDeploymentActivityDto
{
    public int Id { get; set; }
    public int DeploymentId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string? PreviousStatus { get; set; }
    public string? NewStatus { get; set; }
    public string? Remarks { get; set; }
    public int ChangedBy { get; set; }
    public string ChangedByName { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
    public string FormattedChangedAt => ChangedAt.ToString("yyyy-MM-dd HH:mm");
}
