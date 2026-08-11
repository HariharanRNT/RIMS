using RIIMS.Application.DTOs.Report;

namespace RIIMS.Application.Interfaces;

public interface IReportService
{
    Task<AdminDashboardMetricsDto> GetAdminDashboardMetricsAsync();
    Task<EmployeeDashboardMetricsDto> GetEmployeeDashboardMetricsAsync(int employeeId);
    Task<List<MonthlyProductionItemDto>> GetMonthlyProductionReportAsync(int month, int year, int? departmentId = null);
    Task<List<DailyProductionItemDto>> GetDailyProductionReportAsync(DateTime date, int? departmentId = null);
    Task<EmployeeDailyDetailDto> GetEmployeeDailyDetailAsync(int employeeId, DateTime date);
    Task<WorkDistributionReportDto> GetWorkDistributionReportAsync(int month, int year);
}


