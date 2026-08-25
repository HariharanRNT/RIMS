using RIIMS.Domain.Enums;

namespace RIIMS.Application.DTOs.Leave;

public class CreateLeaveRequest
{
    public int LeaveTypeId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public LeaveDuration LeaveDuration { get; set; } = LeaveDuration.FullDay;
    public HalfDayType? HalfDayType { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class LeaveRequestDto
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeCode { get; set; } = string.Empty;
    public string DepartmentName { get; set; } = string.Empty;
    public int LeaveTypeId { get; set; }
    public string LeaveTypeName { get; set; } = string.Empty;
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public LeaveDuration LeaveDuration { get; set; } = LeaveDuration.FullDay;
    public HalfDayType? HalfDayType { get; set; }
    public decimal LeaveDays { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? ApprovedBy { get; set; }
    public string? ApproverName { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
