using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class BreakType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public int AllowedMinutes { get; set; } = 15;

    // Navigation
    public ICollection<BreakLog> BreakLogs { get; set; } = new List<BreakLog>();
}
