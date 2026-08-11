namespace RIIMS.Application.DTOs.Employee;

public class EmployeeDto
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? FatherName { get; set; }
    public string? MotherName { get; set; }
    public string? EmergencyContact1 { get; set; }
    public string? EmergencyContact2 { get; set; }
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int DesignationId { get; set; }
    public string DesignationName { get; set; } = string.Empty;
    public int? ReportingPersonId { get; set; }
    public string? ReportingPersonName { get; set; }
    public DateTime DateOfJoining { get; set; }
    public string? Username { get; set; }
    public string? CompanyName { get; set; }
    public DateTime? DesignationFromDate { get; set; }
    public string? PfNumber { get; set; }
    public string? PanNumber { get; set; }
    public string? EsiNumber { get; set; }
    public string? AadhaarNumber { get; set; }
    public bool IsActive { get; set; }
    public string? TemporaryPassword { get; set; }
}

public class EmployeeListDto
{
    public int Id { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public string DesignationName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateEmployeeRequest
{
    public string EmployeeCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? FatherName { get; set; }
    public string? MotherName { get; set; }
    public string? EmergencyContact1 { get; set; }
    public string? EmergencyContact2 { get; set; }
    public int DepartmentId { get; set; }
    public int DesignationId { get; set; }
    public DateTime? DesignationFromDate { get; set; }
    public int? ReportingPersonId { get; set; }
    public DateTime DateOfJoining { get; set; }
    public string? CompanyName { get; set; }
    public string? PfNumber { get; set; }
    public string? PanNumber { get; set; }
    public string? EsiNumber { get; set; }
    public string? AadhaarNumber { get; set; }
    public string? Password { get; set; }
}

public class UpdateEmployeeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? FatherName { get; set; }
    public string? MotherName { get; set; }
    public string? EmergencyContact1 { get; set; }
    public string? EmergencyContact2 { get; set; }
    public int DepartmentId { get; set; }
    public int DesignationId { get; set; }
    public DateTime? DesignationFromDate { get; set; }
    public int? ReportingPersonId { get; set; }
    public DateTime DateOfJoining { get; set; }
    public string? CompanyName { get; set; }
    public string? PfNumber { get; set; }
    public string? PanNumber { get; set; }
    public string? EsiNumber { get; set; }
    public string? AadhaarNumber { get; set; }
}


public class EmployeeWorkDetailDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string ShiftStart { get; set; } = string.Empty;
    public string ShiftEnd { get; set; } = string.Empty;
    public string WorkLocation { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = string.Empty;
}

public class UpdateWorkDetailRequest
{
    public string ShiftStart { get; set; } = string.Empty;
    public string ShiftEnd { get; set; } = string.Empty;
    public string WorkLocation { get; set; } = string.Empty;
    public string EmploymentType { get; set; } = string.Empty;
}
