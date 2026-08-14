using RIIMS.Application.DTOs.Payroll;

namespace RIIMS.Application.Interfaces;

public interface IMonthlyEmployeeReportService
{
    Task<List<MonthlyEmployeePayrollReportDto>> GetMonthlyReportAsync(int year, int month);
    Task<byte[]> GenerateExcelReportAsync(int year, int month);
}
