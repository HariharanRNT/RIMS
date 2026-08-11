namespace RIIMS.Application.DTOs.Designation;

public class DesignationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateDesignationRequest
{
    public string Name { get; set; } = string.Empty;
}

public class UpdateDesignationRequest
{
    public string Name { get; set; } = string.Empty;
}
