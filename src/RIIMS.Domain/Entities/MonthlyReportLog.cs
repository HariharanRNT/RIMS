using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class MonthlyReportLog : BaseEntity
{
    public int Month { get; set; }
    public int Year { get; set; }
    public DateTime SentAt { get; set; }
    public string RecipientEmail { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
}
