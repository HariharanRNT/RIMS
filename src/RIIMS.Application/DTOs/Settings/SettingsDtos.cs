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
    public TimeSpan SecondHalfStartTime { get; set; } = new TimeSpan(14, 0, 0);
    public int GraceMinutes { get; set; } = 35;
    public decimal PermissionHours { get; set; } = 1.0m;
    public int MonthlyAllowedPermissions { get; set; } = 1;
    public int LateLoginsForHalfDay { get; set; } = 2;
    public int MonthlyAllowedLeave { get; set; } = 1;

    public string OfficeStartTimeDisplay { get; set; } = "10:00 AM";
    public string OfficeEndTimeDisplay { get; set; } = "07:00 PM";
    public string SecondHalfStartTimeDisplay { get; set; } = "02:00 PM";

    // Celebration Settings
    public bool BirthdayWishesEnabled { get; set; } = true;
    public string BirthdayWishesChannel { get; set; } = "Both"; // RIIMS, Email, Both
    public bool BirthdayWishesNotifyAllEmployees { get; set; } = true;

    public bool CompanyAnniversaryWishesEnabled { get; set; } = true;
    public string CompanyAnniversaryWishesChannel { get; set; } = "Both"; // RIIMS, Email, Both
    public bool CompanyAnniversaryWishesNotifyAllEmployees { get; set; } = true;

    public bool MarriageAnniversaryWishesEnabled { get; set; } = true;
    public string MarriageAnniversaryWishesChannel { get; set; } = "Both"; // RIIMS, Email, Both
    public bool MarriageAnniversaryWishesNotifyAllEmployees { get; set; } = false;
}
