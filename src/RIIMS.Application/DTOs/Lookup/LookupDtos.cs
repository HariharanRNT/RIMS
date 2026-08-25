namespace RIIMS.Application.DTOs.Lookup;

public class LookupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? AllowedMinutes { get; set; }
    public bool IsActive { get; set; }
}

public class CreateLookupRequest
{
    public string Name { get; set; } = string.Empty;
    public int? AllowedMinutes { get; set; }
}

public class UpdateLookupRequest
{
    public string Name { get; set; } = string.Empty;
    public int? AllowedMinutes { get; set; }
}
