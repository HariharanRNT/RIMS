using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Payroll;

namespace RIIMS.Application.Interfaces;

public interface IMonthlyEmployeeReportService
{
    Task<PagedResult<MonthlyEmployeePayrollReportDto>> GetMonthlyReportAsync(int year, int month, int page = 1, int pageSize = 25, string? search = null, int? departmentId = null, int? designationId = null, string? lop = null, string? salary = null, int? employeeId = null);
    Task<byte[]> GenerateExcelReportAsync(int year, int month);
}
