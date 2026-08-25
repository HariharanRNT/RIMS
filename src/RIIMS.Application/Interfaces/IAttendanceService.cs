using RIIMS.Application.DTOs.Attendance;

namespace RIIMS.Application.Interfaces;

public interface IAttendanceService
{
    Task<AttendanceDto> LoginAsync(int employeeId);
    Task LogoutAsync(int employeeId);
    Task<AttendanceDto?> GetByDateAsync(int employeeId, DateTime date);
    Task<List<AttendanceDto>> GetByRangeAsync(int employeeId, DateTime from, DateTime to);
    Task<MarkPermissionResultDto> MarkPermissionAsync(int attendanceId, bool force = false);
    Task<PermissionSummaryDto> GetPermissionSummaryAsync(int employeeId, int year, int month);
    Task<decimal> RecalculateMonthlyAttendanceLOPAsync(int employeeId, int year, int month);
}
