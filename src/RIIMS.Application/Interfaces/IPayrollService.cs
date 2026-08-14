using RIIMS.Application.DTOs.Payroll;

namespace RIIMS.Application.Interfaces;

public interface IPayrollService
{
    Task<PayrollSummaryDto> ProcessMonthlyPayrollAsync(int month, int year);
    Task ProcessMonthlyPayrollForEmployeeAsync(int employeeId, int month, int year);
    Task<PayrollSummaryDto> GetMonthlyPayrollSummaryAsync(int month, int year);
    Task<PayslipDto?> GetEmployeePayslipAsync(int employeeId, int month, int year);
    Task<List<PayslipDto>> GetEmployeePayslipHistoryAsync(int employeeId);
}
