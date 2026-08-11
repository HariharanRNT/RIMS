using RIIMS.Application.DTOs.Leave;

namespace RIIMS.Application.Interfaces;

public interface ILeaveService
{
    Task<LeaveRequestDto> SubmitLeaveAsync(int employeeId, CreateLeaveRequest request);
    Task<List<LeaveRequestDto>> GetEmployeeLeavesAsync(int employeeId);
    Task<List<LeaveRequestDto>> GetPendingApprovalsAsync(int currentEmployeeId, bool isAdmin);
    Task ApproveLeaveAsync(int leaveRequestId, int approverEmployeeId);
    Task RejectLeaveAsync(int leaveRequestId, int approverEmployeeId);
}
