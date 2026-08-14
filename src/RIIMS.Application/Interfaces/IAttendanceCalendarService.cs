using RIIMS.Application.DTOs.AttendanceCalendar;

namespace RIIMS.Application.Interfaces;

public interface IAttendanceCalendarService
{
    Task<List<AttendanceCalendarDto>> GetMonthlyCalendarAsync(int year, int month);
    Task<List<AttendanceCalendarDto>> GenerateMonthlyCalendarAsync(int year, int month);
    Task<AttendanceCalendarDto> UpdateCalendarDayAsync(int id, UpdateCalendarDayRequestDto dto, int userId);
    Task<MonthCalendarStatusDto> PublishMonthlyCalendarAsync(int year, int month, int userId);
    Task<MonthCalendarStatusDto> GetCalendarStatusAsync(int year, int month);
    Task<List<AttendanceCalendarAuditDto>> GetCalendarAuditLogsAsync(int calendarId);
    Task<AttendanceCalendarDto?> GetDayCalendarAsync(DateOnly date);
    Task<bool> IsWorkingDayForEmployeeAsync(DateOnly date, int employeeId);
    Task<List<EmployeeDailyAttendanceSummaryDto>> GetEmployeeMonthlyAttendanceAsync(int employeeId, int year, int month);
    Task<EmployeeMonthlyAttendanceReportDto> GetEmployeeMonthlyAttendanceReportAsync(int employeeId, int year, int month);
}
