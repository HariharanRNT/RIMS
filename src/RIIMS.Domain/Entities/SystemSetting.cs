using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

/// <summary>
/// Key-value system settings table.
/// Used for system-wide configuration like GraceMinutes.
/// </summary>
public class SystemSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}
