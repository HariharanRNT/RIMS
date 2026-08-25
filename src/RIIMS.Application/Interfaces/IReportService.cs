using RIIMS.Application.DTOs.Report;

namespace RIIMS.Application.Interfaces;

public interface IReportService
{
    Task<AdminDashboardMetricsDto> GetAdminDashboardMetricsAsync();
    Task<EmployeeDashboardMetricsDto> GetEmployeeDashboardMetricsAsync(int employeeId);
    Task<List<MonthlyProductionItemDto>> GetMonthlyProductionReportAsync(int month, int year, int? employeeId = null, int? departmentId = null);
    Task<List<DailyProductionItemDto>> GetDailyProductionReportAsync(DateTime startDate, DateTime endDate, int? employeeId = null, int? departmentId = null);
    Task<EmployeeDailyDetailDto> GetEmployeeDailyDetailAsync(int employeeId, DateTime startDate, DateTime endDate);
    Task<byte[]> ExportDailyProductionExcelAsync(DateTime startDate, DateTime endDate, int? employeeId = null, int? departmentId = null);
    Task<WorkDistributionReportDto> GetWorkDistributionReportAsync(int month, int year);
    Task<AdminNotificationSummaryDto> GetAdminNotificationsAsync(int adminUserId);
    Task MarkNotificationReadAsync(int adminUserId, string notificationKey);
    Task MarkAllNotificationsReadAsync(int adminUserId);
}


