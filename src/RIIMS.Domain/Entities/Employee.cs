using RIIMS.Domain.Common;

namespace RIIMS.Domain.Entities;

public class Employee : BaseEntity
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

    // Navigation
    public Department Department { get; set; } = null!;
    public Designation Designation { get; set; } = null!;
    public Employee? ReportingPerson { get; set; }
    public ICollection<Employee> Reportees { get; set; } = new List<Employee>();
    public EmployeeWorkDetail? WorkDetail { get; set; }
    public ICollection<WorkTask> Tasks { get; set; } = new List<WorkTask>();
    public ICollection<AttendanceLog> AttendanceLogs { get; set; } = new List<AttendanceLog>();
    public ICollection<BreakLog> BreakLogs { get; set; } = new List<BreakLog>();
    public ICollection<SupportActivityLog> SupportActivityLogs { get; set; } = new List<SupportActivityLog>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<PermissionRequest> PermissionRequests { get; set; } = new List<PermissionRequest>();
    public ICollection<PayslipDetail> PayslipDetails { get; set; } = new List<PayslipDetail>();
    public ICollection<ActivityTimeline> ActivityTimelines { get; set; } = new List<ActivityTimeline>();
    public ICollection<GraceTimeViolation> GraceTimeViolations { get; set; } = new List<GraceTimeViolation>();
    public ICollection<LOPCalculation> LOPCalculations { get; set; } = new List<LOPCalculation>();
}
