using RIIMS.Domain.Common;
using RIIMS.Domain.Enums;

namespace RIIMS.Domain.Entities;

public class DemoFollowUp : BaseEntity
{
    public int EmployeeId { get; set; }
    public int SupportActivityLogId { get; set; }
    public int ProductId { get; set; }
    public int ClientId { get; set; }

    public string ReviewRemarks { get; set; } = string.Empty;
    public DateTime FollowUpDate { get; set; }
    public DemoFollowUpStatus Status { get; set; } = DemoFollowUpStatus.Pending;

    public DateTime? ReminderSentAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public SupportActivityLog SupportActivityLog { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public Client Client { get; set; } = null!;
}
