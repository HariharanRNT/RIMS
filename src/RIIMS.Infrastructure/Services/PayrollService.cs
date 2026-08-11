using Microsoft.EntityFrameworkCore;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class PayrollService : IPayrollService
{
    private readonly RiimsDbContext _context;

    public PayrollService(RiimsDbContext context)
    {
        _context = context;
    }

    public async Task<PayrollSummaryDto> ProcessMonthlyPayrollAsync(int month, int year)
    {
        var activeEmployees = await _context.Employees
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .Where(e => e.IsActive)
            .ToListAsync();

        var daysInMonth = DateTime.DaysInMonth(year, month);

        foreach (var emp in activeEmployees)
        {
            // 1. Calculate Grace Violations LOP (Rule #9: Every 3 Grace Violations = 0.5 LOP Days)
            var graceViolations = await _context.GraceTimeViolations
                .CountAsync(g => g.EmployeeId == emp.Id && g.Date.Month == month && g.Date.Year == year);

            var graceLOPDays = (graceViolations / 3) * 0.5m;

            if (graceLOPDays > 0)
            {
                var existingGraceLOP = await _context.LOPCalculations
                    .FirstOrDefaultAsync(l => l.EmployeeId == emp.Id && l.Month == month && l.Year == year && l.Reason == "3 Grace Violations");

                if (existingGraceLOP == null)
                {
                    _context.LOPCalculations.Add(new LOPCalculation
                    {
                        EmployeeId = emp.Id,
                        Month = month,
                        Year = year,
                        LOPDays = graceLOPDays,
                        Reason = "3 Grace Violations"
                    });
                }
                else
                {
                    existingGraceLOP.LOPDays = graceLOPDays;
                }
            }

            await _context.SaveChangesAsync();

            // 2. Aggregate LOP Days
            var totalLOPDays = await _context.LOPCalculations
                .Where(l => l.EmployeeId == emp.Id && l.Month == month && l.Year == year)
                .SumAsync(l => l.LOPDays);

            // 3. Count Approved Leaves & Permissions
            var leavesTaken = await _context.LeaveRequests
                .Where(l => l.EmployeeId == emp.Id && l.Status == RequestStatus.Approved && l.FromDate.Month == month && l.FromDate.Year == year)
                .CountAsync();

            var permissionsUsed = await _context.PermissionRequests
                .Where(p => p.EmployeeId == emp.Id && p.Status == RequestStatus.Approved && p.RequestDate.Month == month && p.RequestDate.Year == year)
                .CountAsync();

            // 4. Calculate Salary Breakdown Components
            decimal grossSalary = 50000.00m;
            decimal basicPay = Math.Round(grossSalary * 0.50m, 2); // 50%
            decimal hra = Math.Round(basicPay * 0.40m, 2);        // 40% of Basic
            decimal conveyance = 1600.00m;
            decimal medical = 1250.00m;
            decimal arrears = 0.00m;
            decimal allowances = Math.Max(0, grossSalary - (basicPay + hra + conveyance + medical));
            decimal totalSalary = basicPay + hra + conveyance + medical + allowances + arrears;

            // 5. Calculate Deductions Breakdown
            decimal dailyRate = totalSalary / daysInMonth;
            decimal lopDeduction = Math.Round(dailyRate * totalLOPDays, 2);
            decimal esi = 0.00m;
            decimal pf = 0.00m;
            decimal parkingCharges = 0.00m;
            decimal tds = 0.00m;
            decimal totalDeduction = Math.Round(lopDeduction + esi + pf + parkingCharges + tds, 2);

            decimal netPay = Math.Max(0, totalSalary - totalDeduction);

            // 6. Create or Update PayslipDetail snapshot
            var existingPayslip = await _context.PayslipDetails
                .FirstOrDefaultAsync(p => p.EmployeeId == emp.Id && p.Month == month && p.Year == year);

            if (existingPayslip == null)
            {
                _context.PayslipDetails.Add(new PayslipDetail
                {
                    EmployeeId = emp.Id,
                    Month = month,
                    Year = year,
                    BasicPay = basicPay,
                    Hra = hra,
                    Conveyance = conveyance,
                    Medical = medical,
                    Allowances = allowances,
                    Arrears = arrears,
                    TotalSalary = totalSalary,
                    LopDeduction = lopDeduction,
                    Esi = esi,
                    Pf = pf,
                    ParkingCharges = parkingCharges,
                    Tds = tds,
                    TotalDeduction = totalDeduction,
                    NetPay = netPay,
                    LOPDays = totalLOPDays,
                    LeavesTaken = leavesTaken,
                    PermissionsUsed = permissionsUsed,
                    GraceViolations = graceViolations
                });
            }
            else
            {
                existingPayslip.BasicPay = basicPay;
                existingPayslip.Hra = hra;
                existingPayslip.Conveyance = conveyance;
                existingPayslip.Medical = medical;
                existingPayslip.Allowances = allowances;
                existingPayslip.Arrears = arrears;
                existingPayslip.TotalSalary = totalSalary;
                existingPayslip.LopDeduction = lopDeduction;
                existingPayslip.Esi = esi;
                existingPayslip.Pf = pf;
                existingPayslip.ParkingCharges = parkingCharges;
                existingPayslip.Tds = tds;
                existingPayslip.TotalDeduction = totalDeduction;
                existingPayslip.NetPay = netPay;
                existingPayslip.LOPDays = totalLOPDays;
                existingPayslip.LeavesTaken = leavesTaken;
                existingPayslip.PermissionsUsed = permissionsUsed;
                existingPayslip.GraceViolations = graceViolations;
            }
        }

        await _context.SaveChangesAsync();

        return await GetMonthlyPayrollSummaryAsync(month, year);
    }

    public async Task<PayrollSummaryDto> GetMonthlyPayrollSummaryAsync(int month, int year)
    {
        var payslips = await _context.PayslipDetails
            .Include(p => p.Employee)
                .ThenInclude(e => e.Department)
            .Include(p => p.Employee)
                .ThenInclude(e => e.Designation)
            .Where(p => p.Month == month && p.Year == year)
            .ToListAsync();

        var payslipDtos = payslips.Select(MapToDto).ToList();

        return new PayrollSummaryDto
        {
            Month = month,
            Year = year,
            TotalEmployees = payslipDtos.Count,
            TotalBasicPay = payslipDtos.Sum(p => p.BasicPay),
            TotalDeductions = payslipDtos.Sum(p => p.TotalDeduction),
            TotalNetPay = payslipDtos.Sum(p => p.NetPay),
            Payslips = payslipDtos
        };
    }

    public async Task<PayslipDto?> GetEmployeePayslipAsync(int employeeId, int month, int year)
    {
        var payslip = await _context.PayslipDetails
            .Include(p => p.Employee)
                .ThenInclude(e => e.Department)
            .Include(p => p.Employee)
                .ThenInclude(e => e.Designation)
            .FirstOrDefaultAsync(p => p.EmployeeId == employeeId && p.Month == month && p.Year == year);

        return payslip != null ? MapToDto(payslip) : null;
    }

    public async Task<List<PayslipDto>> GetEmployeePayslipHistoryAsync(int employeeId)
    {
        var payslips = await _context.PayslipDetails
            .Include(p => p.Employee)
                .ThenInclude(e => e.Department)
            .Include(p => p.Employee)
                .ThenInclude(e => e.Designation)
            .Where(p => p.EmployeeId == employeeId)
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .ToListAsync();

        return payslips.Select(MapToDto).ToList();
    }

    private static PayslipDto MapToDto(PayslipDetail p) => new()
    {
        Id = p.Id,
        EmployeeId = p.EmployeeId,
        EmployeeName = p.Employee.Name,
        EmployeeCode = p.Employee.EmployeeCode,
        DepartmentName = p.Employee.Department?.Name ?? string.Empty,
        DesignationName = p.Employee.Designation?.Name ?? string.Empty,
        DateOfJoining = p.Employee.DateOfJoining,
        Month = p.Month,
        Year = p.Year,
        BasicPay = p.BasicPay,
        Hra = p.Hra,
        Conveyance = p.Conveyance,
        Medical = p.Medical,
        Allowances = p.Allowances,
        Arrears = p.Arrears,
        TotalSalary = p.TotalSalary,
        LopDeduction = p.LopDeduction,
        Esi = p.Esi,
        Pf = p.Pf,
        ParkingCharges = p.ParkingCharges,
        Tds = p.Tds,
        TotalDeduction = p.TotalDeduction,
        NetPay = p.NetPay,
        LOPDays = p.LOPDays,
        LeavesTaken = p.LeavesTaken,
        PermissionsUsed = p.PermissionsUsed,
        GraceViolations = p.GraceViolations,
        CreatedAt = p.CreatedAt
    };
}
