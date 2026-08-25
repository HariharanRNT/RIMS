using System;
using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class CelebrationLog : BaseEntity
{
    public int EmployeeId { get; set; }
    public string EventType { get; set; } = string.Empty; // Birthday, CompanyAnniversary, MarriageAnniversary
    public DateTime EventDate { get; set; } // Specific date (e.g. 2026-08-19)
    public string Channel { get; set; } = string.Empty; // RIIMS, Email, Both
    public string RecipientScope { get; set; } = string.Empty; // AllEmployees, SelfAndAdmin
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Employee Employee { get; set; } = null!;
}
