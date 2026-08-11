namespace RIIMS.Application.DTOs.Settings;

public class SystemSettingDto
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateSettingRequest
{
    public string Value { get; set; } = string.Empty;
}

public class TypedSystemSettingsDto
{
    public TimeSpan OfficeStartTime { get; set; } = new TimeSpan(10, 0, 0);
    public TimeSpan OfficeEndTime { get; set; } = new TimeSpan(19, 0, 0);
    public int GraceMinutes { get; set; } = 15;
    public decimal PermissionHours { get; set; } = 1.0m;
    public int LateLoginsForHalfDay { get; set; } = 2;

    public string OfficeStartTimeDisplay { get; set; } = "10:00 AM";
    public string OfficeEndTimeDisplay { get; set; } = "07:00 PM";
}
