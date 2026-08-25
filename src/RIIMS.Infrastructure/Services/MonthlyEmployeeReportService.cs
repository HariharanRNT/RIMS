using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using RIIMS.Application.Common;
using RIIMS.Application.DTOs.Payroll;
using RIIMS.Application.Interfaces;
using RIIMS.Domain.Entities;
using RIIMS.Domain.Enums;
using RIIMS.Infrastructure.Data;

namespace RIIMS.Infrastructure.Services;

public class MonthlyEmployeeReportService : IMonthlyEmployeeReportService
{
    private readonly RiimsDbContext _context;
    private readonly ISystemSettingService _settingService;
    private readonly IAttendanceCalendarService _calendarService;

    private static readonly TimeZoneInfo IstTimeZone = GetIstTimeZone();

    private static TimeZoneInfo GetIstTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Indian Standard Time");
        }
        catch
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        }
    }

    public MonthlyEmployeeReportService(
        RiimsDbContext context,
        ISystemSettingService settingService,
        IAttendanceCalendarService calendarService)
    {
        _context = context;
        _settingService = settingService;
        _calendarService = calendarService;
    }

    public async Task<PagedResult<MonthlyEmployeePayrollReportDto>> GetMonthlyReportAsync(
        int year,
        int month,
        int page = 1,
        int pageSize = 25,
        string? search = null,
        int? departmentId = null,
        int? designationId = null,
        string? lop = null,
        string? salary = null,
        int? employeeId = null)
    {
        var activeEmployees = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Department)
            .Include(e => e.Designation)
            .Where(e => e.IsActive)
            .OrderBy(e => e.EmployeeCode)
            .ToListAsync();

        var daysInMonth = DateTime.DaysInMonth(year, month);
        var calendarEntries = await _calendarService.GetMonthlyCalendarAsync(year, month);
        var settings = await _settingService.GetTypedSettingsAsync();
        string monthName = new DateTime(year, month, 1).ToString("MMMM");

        decimal totalWorkingDays = calendarEntries.Count(c => c.DayType == AttendanceDayType.WorkingDay || c.DayType == AttendanceDayType.SpecialWorkingDay);
        decimal totalWeekendDays = calendarEntries.Count(c => c.DayType == AttendanceDayType.Weekend);
        decimal totalHolidayDays = calendarEntries.Count(c => c.DayType == AttendanceDayType.CompanyHoliday || c.DayType == AttendanceDayType.OptionalHoliday);

        // Precise IST Month Range in UTC
        DateTime monthStartIst = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Unspecified);
        DateTime monthEndIst = new DateTime(year, month, daysInMonth, 23, 59, 59, DateTimeKind.Unspecified);

        DateTime startDateUtc = TimeZoneInfo.ConvertTimeToUtc(monthStartIst, IstTimeZone);
        DateTime endDateUtc = TimeZoneInfo.ConvertTimeToUtc(monthEndIst, IstTimeZone);

        DateTime payslipMonthStart = new DateTime(year, month, 1);
        DateTime payslipMonthEnd = new DateTime(year, month, daysInMonth);

        var reportList = new List<MonthlyEmployeePayrollReportDto>();

        foreach (var emp in activeEmployees)
        {
            var existingPayslip = await _context.PayslipDetails
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.EmployeeId == emp.Id && p.Month == month && p.Year == year);

            var livePermissionCount = await _context.PermissionRequests
                .AsNoTracking()
                .Where(p => p.EmployeeId == emp.Id && p.Status == RequestStatus.Approved && p.RequestDate.Month == month && p.RequestDate.Year == year)
                .CountAsync();

            var attendanceLogs = await _context.AttendanceLogs
                .AsNoTracking()
                .Where(a => a.EmployeeId == emp.Id && a.LoginTime >= startDateUtc && a.LoginTime <= endDateUtc)
                .ToListAsync();

            // Daily First Login Rule: Only the earliest valid login event of each calendar working day is evaluated for late login
            var firstLogsByDate = attendanceLogs
                .GroupBy(a => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(a.LoginTime, IstTimeZone)))
                .Select(g => g.OrderBy(a => a.LoginTime).First())
                .ToList();

            var liveLateLoginCount = firstLogsByDate.Count(a => a.IsLate);

            var approvedLeaves = await _context.LeaveRequests
                .AsNoTracking()
                .Include(l => l.LeaveType)
                .Where(l => l.EmployeeId == emp.Id && l.Status == RequestStatus.Approved && l.FromDate <= endDateUtc && l.ToDate >= startDateUtc)
                .ToListAsync();

            string payrollStatus;
            decimal monthlySalary;
            decimal dailySalary;
            int monthlyAllowedLeave;
            decimal approvedLeaveDays;
            decimal sandwichLeaveDays;
            decimal leaveLopDays;
            decimal lateLoginLopDays;
            decimal totalLopDays;
            decimal lopAmount;
            decimal totalDeduction;
            decimal finalSalary;
            decimal presentDays;
            int permissionCount = livePermissionCount;
            int lateLoginCount = liveLateLoginCount;

            if (existingPayslip != null)
            {
                payrollStatus = "Finalized";
                monthlySalary = existingPayslip.TotalSalary;
                dailySalary = existingPayslip.DailySalary > 0 ? existingPayslip.DailySalary : Math.Round(monthlySalary / 31m, 4);
                monthlyAllowedLeave = existingPayslip.MonthlyAllowedLeave;
                approvedLeaveDays = existingPayslip.ActualLeaveDays;
                sandwichLeaveDays = existingPayslip.SandwichLeaveDays;
                leaveLopDays = existingPayslip.LeaveLOPDays;
                lateLoginLopDays = existingPayslip.LateLoginLOPDays;
                totalLopDays = existingPayslip.LOPDays;
                lopAmount = existingPayslip.LopDeduction;
                totalDeduction = existingPayslip.TotalDeduction;
                finalSalary = existingPayslip.NetPay;
                presentDays = firstLogsByDate.Count;
                permissionCount = existingPayslip.PermissionsUsed;
                lateLoginCount = existingPayslip.GraceViolations;
            }
            else
            {
                payrollStatus = "Pending / Live Preview";

                var activeSalaryStructure = await _context.EmployeeSalaryStructures
                    .AsNoTracking()
                    .Include(s => s.Components)
                    .Where(s => s.EmployeeId == emp.Id && s.EffectiveFrom <= payslipMonthEnd && (s.EffectiveTo == null || s.EffectiveTo >= payslipMonthStart))
                    .OrderByDescending(s => s.EffectiveFrom)
                    .FirstOrDefaultAsync();

                if (activeSalaryStructure == null)
                {
                    activeSalaryStructure = await _context.EmployeeSalaryStructures
                        .AsNoTracking()
                        .Include(s => s.Components)
                        .Where(s => s.EmployeeId == emp.Id && s.IsActive)
                        .OrderByDescending(s => s.EffectiveFrom)
                        .FirstOrDefaultAsync();
                }

                decimal basicPay = 0m;
                decimal hra = 0m;
                decimal conveyance = 0m;
                decimal medical = 0m;
                decimal allowances = 0m;
                decimal arrears = 0m;

                decimal esi = 0m;
                decimal pf = 0m;
                decimal parkingCharges = 0m;
                decimal tds = 0m;

                if (activeSalaryStructure != null && activeSalaryStructure.Components.Any())
                {
                    foreach (var c in activeSalaryStructure.Components)
                    {
                        switch (c.ComponentType)
                        {
                            case SalaryComponentType.BasicSalary:
                                basicPay = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.HRA:
                                hra = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.Conveyance:
                                conveyance = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.Medical:
                                medical = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.SpecialAllowance:
                                allowances += c.MonthlyAmount;
                                break;
                            case SalaryComponentType.Arrears:
                                arrears = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.Other:
                                if (c.IsEarning) allowances += c.MonthlyAmount;
                                else if (c.IsDeduction && !c.IsEmployerContribution) parkingCharges += c.MonthlyAmount;
                                break;
                            case SalaryComponentType.PF:
                                if (activeSalaryStructure.PFApplicable && c.IsDeduction && !c.IsEmployerContribution) pf = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.ESI:
                                if (activeSalaryStructure.ESIApplicable && c.IsDeduction && !c.IsEmployerContribution) esi = c.MonthlyAmount;
                                break;
                            case SalaryComponentType.ProfessionalTax:
                                if (activeSalaryStructure.ProfessionalTaxApplicable && c.IsDeduction && !c.IsEmployerContribution) parkingCharges += c.MonthlyAmount;
                                break;
                            case SalaryComponentType.TDS:
                                if (activeSalaryStructure.TDSApplicable && c.IsDeduction && !c.IsEmployerContribution) tds = c.MonthlyAmount;
                                break;
                        }
                    }
                }
                else if (activeSalaryStructure != null && activeSalaryStructure.MonthlyCTC > 0m)
                {
                    decimal grossSalary = activeSalaryStructure.MonthlyCTC;
                    basicPay = Math.Round(grossSalary * 0.50m, 2);
                    hra = Math.Round(basicPay * 0.40m, 2);
                    conveyance = 1600.00m;
                    medical = 1250.00m;
                    arrears = 0.00m;
                    allowances = Math.Max(0, grossSalary - (basicPay + hra + conveyance + medical));
                }

                if (activeSalaryStructure != null)
                {
                    if (pf == 0m && activeSalaryStructure.PFApplicable)
                    {
                        pf = Math.Round(basicPay * 0.12m, 2);
                    }

                    if (esi == 0m && activeSalaryStructure.ESIApplicable && (basicPay + hra + conveyance + medical + allowances) <= 21000m)
                    {
                        esi = Math.Round((basicPay + hra + conveyance + medical + allowances) * 0.0075m, 2);
                    }

                    if (parkingCharges == 0m && activeSalaryStructure.ProfessionalTaxApplicable)
                    {
                        parkingCharges = 200.00m;
                    }
                }

                monthlySalary = basicPay + hra + conveyance + medical + allowances + arrears;

                var approvedPermissions = await _context.PermissionRequests
                    .AsNoTracking()
                    .Where(p => p.EmployeeId == emp.Id && p.Status == RequestStatus.Approved && p.RequestDate >= startDateUtc && p.RequestDate <= endDateUtc)
                    .ToListAsync();

                var lopResult = LeaveLopCalculator.Calculate(
                    emp.Id,
                    year,
                    month,
                    settings.MonthlyAllowedLeave,
                    settings.LateLoginsForHalfDay,
                    monthlySalary,
                    calendarEntries,
                    approvedLeaves,
                    attendanceLogs,
                    approvedPermissions,
                    settings);

                dailySalary = lopResult.DailySalary;
                monthlyAllowedLeave = settings.MonthlyAllowedLeave;
                approvedLeaveDays = lopResult.ActualLeaveDays;
                sandwichLeaveDays = lopResult.SandwichLeaveDays;
                leaveLopDays = lopResult.LeaveLOPDays;
                lateLoginLopDays = lopResult.LateLoginLOPDays;
                totalLopDays = lopResult.TotalLOPDays;
                lopAmount = lopResult.TotalLOPAmount;
                totalDeduction = Math.Round(lopAmount + esi + pf + parkingCharges + tds, 2);
                finalSalary = Math.Max(0, monthlySalary - totalDeduction);
                presentDays = lopResult.PresentDays;
                permissionCount = lopResult.PermissionCount;
                lateLoginCount = lopResult.TotalLateCount;
            }

            reportList.Add(new MonthlyEmployeePayrollReportDto
            {
                EmployeeId = emp.Id,
                EmployeeCode = emp.EmployeeCode,
                EmployeeName = emp.Name,
                Department = emp.Department?.Name,
                Designation = emp.Designation?.Name,
                Year = year,
                Month = month,
                MonthName = monthName,
                PayrollStatus = payrollStatus,
                WorkingDays = totalWorkingDays,
                PresentDays = presentDays,
                ApprovedLeaveDays = approvedLeaveDays,
                MonthlyAllowedLeave = monthlyAllowedLeave,
                SandwichLeaveDays = sandwichLeaveDays,
                WeekendDays = totalWeekendDays,
                HolidayDays = totalHolidayDays,
                PermissionCount = permissionCount,
                LateLoginCount = lateLoginCount,
                LateLoginLOPDays = lateLoginLopDays,
                LeaveLOPDays = leaveLopDays,
                TotalLOPDays = totalLopDays,
                MonthlySalary = monthlySalary,
                DailySalary = dailySalary,
                LOPAmount = lopAmount,
                TotalDeduction = totalDeduction,
                FinalSalary = finalSalary
            });
        }

        var queryable = reportList.AsQueryable();

        if (employeeId.HasValue)
        {
            queryable = queryable.Where(x => x.EmployeeId == employeeId.Value);
        }

        if (departmentId.HasValue)
        {
            var dept = await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == departmentId.Value);
            if (dept != null)
            {
                queryable = queryable.Where(x => string.Equals(x.Department, dept.Name, StringComparison.OrdinalIgnoreCase));
            }
        }

        if (designationId.HasValue)
        {
            var desig = await _context.Designations.AsNoTracking().FirstOrDefaultAsync(d => d.Id == designationId.Value);
            if (desig != null)
            {
                queryable = queryable.Where(x => string.Equals(x.Designation, desig.Name, StringComparison.OrdinalIgnoreCase));
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            queryable = queryable.Where(x =>
                x.EmployeeName.ToLower().Contains(s) ||
                x.EmployeeCode.ToLower().Contains(s) ||
                (x.Department != null && x.Department.ToLower().Contains(s)) ||
                (x.Designation != null && x.Designation.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(lop))
        {
            if (lop.Equals("hasLop", StringComparison.OrdinalIgnoreCase))
                queryable = queryable.Where(x => x.TotalLOPDays > 0);
            else if (lop.Equals("noLop", StringComparison.OrdinalIgnoreCase))
                queryable = queryable.Where(x => x.TotalLOPDays == 0);
        }

        if (!string.IsNullOrWhiteSpace(salary))
        {
            if (salary.Equals("finalized", StringComparison.OrdinalIgnoreCase))
                queryable = queryable.Where(x => x.PayrollStatus == "Finalized");
            else if (salary.Equals("pending", StringComparison.OrdinalIgnoreCase))
                queryable = queryable.Where(x => x.PayrollStatus != "Finalized");
        }

        var filteredList = queryable.ToList();
        var totalCount = filteredList.Count;
        var safePage = page < 1 ? 1 : page;
        var safePageSize = pageSize <= 0 ? 25 : (pageSize > 100 ? 100 : pageSize);
        var pagedItems = filteredList
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToList();

        return new PagedResult<MonthlyEmployeePayrollReportDto>
        {
            Items = pagedItems,
            TotalCount = totalCount,
            Page = safePage,
            PageSize = safePageSize
        };
    }

    public async Task<byte[]> GenerateExcelReportAsync(int year, int month)
    {
        var pagedResult = await GetMonthlyReportAsync(year, month, page: 1, pageSize: int.MaxValue);
        var items = pagedResult.Items;
        string monthName = new DateTime(year, month, 1).ToString("MMMM");

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Monthly Payroll Report");

        // Title Block
        worksheet.Cell(1, 1).Value = "RIIMS V2 - Monthly Employee Payroll Report";
        worksheet.Cell(1, 1).Style.Font.SetBold(true);
        worksheet.Cell(1, 1).Style.Font.SetFontSize(16);
        worksheet.Cell(1, 1).Style.Font.SetFontColor(XLColor.FromHtml("#1E3A8A"));

        worksheet.Cell(2, 1).Value = $"Month: {monthName} {year}   |   Generated: {DateTime.UtcNow:dd-MMM-yyyy HH:mm:ss UTC}";
        worksheet.Cell(2, 1).Style.Font.SetItalic(true);
        worksheet.Cell(2, 1).Style.Font.SetFontSize(10);
        worksheet.Cell(2, 1).Style.Font.SetFontColor(XLColor.FromHtml("#475569"));

        // Header Row at Row 4
        string[] headers = new[]
        {
            "Employee ID",
            "Employee Name",
            "Department",
            "Designation",
            "Month",
            "Year",
            "Payroll Status",
            "Working Days",
            "Present Days",
            "Approved Leave Days",
            "Monthly Allowed Leave",
            "Sandwich Leave Days",
            "Weekend Days",
            "Holiday Days",
            "Permission Count",
            "Late Login Count",
            "Late Login LOP Days",
            "Leave LOP Days",
            "Total LOP Days",
            "Monthly Salary",
            "Daily Salary",
            "LOP Amount",
            "Total Deduction",
            "Final Salary"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            var cell = worksheet.Cell(4, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.SetBold(true);
            cell.Style.Font.SetFontColor(XLColor.White);
            cell.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#1E3A8A"));
            cell.Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            cell.Style.Alignment.SetVertical(XLAlignmentVerticalValues.Center);
        }
        worksheet.Row(4).Height = 26;

        string inrFormat = "\"₹\"#,##0.00";
        int row = 5;

        foreach (var item in items)
        {
            worksheet.Cell(row, 1).Value = item.EmployeeCode;
            worksheet.Cell(row, 2).Value = item.EmployeeName;
            worksheet.Cell(row, 3).Value = item.Department ?? "";
            worksheet.Cell(row, 4).Value = item.Designation ?? "";
            worksheet.Cell(row, 5).Value = item.MonthName;
            worksheet.Cell(row, 6).Value = item.Year;
            worksheet.Cell(row, 7).Value = item.PayrollStatus;

            worksheet.Cell(row, 8).Value = item.WorkingDays;
            worksheet.Cell(row, 9).Value = item.PresentDays;
            worksheet.Cell(row, 10).Value = item.ApprovedLeaveDays;
            worksheet.Cell(row, 11).Value = item.MonthlyAllowedLeave;
            worksheet.Cell(row, 12).Value = item.SandwichLeaveDays;
            worksheet.Cell(row, 13).Value = item.WeekendDays;
            worksheet.Cell(row, 14).Value = item.HolidayDays;
            worksheet.Cell(row, 15).Value = item.PermissionCount;
            worksheet.Cell(row, 16).Value = item.LateLoginCount;
            worksheet.Cell(row, 17).Value = item.LateLoginLOPDays;
            worksheet.Cell(row, 18).Value = item.LeaveLOPDays;
            worksheet.Cell(row, 19).Value = item.TotalLOPDays;

            worksheet.Cell(row, 20).Value = item.MonthlySalary;
            worksheet.Cell(row, 20).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(row, 21).Value = item.DailySalary;
            worksheet.Cell(row, 21).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(row, 22).Value = item.LOPAmount;
            worksheet.Cell(row, 22).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(row, 23).Value = item.TotalDeduction;
            worksheet.Cell(row, 23).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(row, 24).Value = item.FinalSalary;
            worksheet.Cell(row, 24).Style.NumberFormat.SetFormat(inrFormat);

            // Alignment formatting
            worksheet.Cell(row, 1).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            worksheet.Cell(row, 5).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            worksheet.Cell(row, 6).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);
            worksheet.Cell(row, 7).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Center);

            for (int col = 8; col <= 19; col++)
            {
                worksheet.Cell(row, col).Style.Alignment.SetHorizontal(XLAlignmentHorizontalValues.Right);
            }

            row++;
        }

        // Summary Row
        int summaryRow = row;
        worksheet.Cell(summaryRow, 1).Value = $"Total ({items.Count} Employees)";
        worksheet.Cell(summaryRow, 1).Style.Font.SetBold(true);

        if (items.Any())
        {
            int lastDataRow = summaryRow - 1;

            worksheet.Cell(summaryRow, 8).FormulaA1 = $"SUM(H5:H{lastDataRow})";
            worksheet.Cell(summaryRow, 9).FormulaA1 = $"SUM(I5:I{lastDataRow})";
            worksheet.Cell(summaryRow, 10).FormulaA1 = $"SUM(J5:J{lastDataRow})";
            worksheet.Cell(summaryRow, 12).FormulaA1 = $"SUM(L5:L{lastDataRow})";
            worksheet.Cell(summaryRow, 15).FormulaA1 = $"SUM(O5:O{lastDataRow})";
            worksheet.Cell(summaryRow, 16).FormulaA1 = $"SUM(P5:P{lastDataRow})";
            worksheet.Cell(summaryRow, 17).FormulaA1 = $"SUM(Q5:Q{lastDataRow})";
            worksheet.Cell(summaryRow, 18).FormulaA1 = $"SUM(R5:R{lastDataRow})";
            worksheet.Cell(summaryRow, 19).FormulaA1 = $"SUM(S5:S{lastDataRow})";

            worksheet.Cell(summaryRow, 20).FormulaA1 = $"SUM(T5:T{lastDataRow})";
            worksheet.Cell(summaryRow, 20).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(summaryRow, 22).FormulaA1 = $"SUM(V5:V{lastDataRow})";
            worksheet.Cell(summaryRow, 22).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(summaryRow, 23).FormulaA1 = $"SUM(W5:W{lastDataRow})";
            worksheet.Cell(summaryRow, 23).Style.NumberFormat.SetFormat(inrFormat);

            worksheet.Cell(summaryRow, 24).FormulaA1 = $"SUM(X5:X{lastDataRow})";
            worksheet.Cell(summaryRow, 24).Style.NumberFormat.SetFormat(inrFormat);
        }

        var summaryRange = worksheet.Range(summaryRow, 1, summaryRow, 24);
        summaryRange.Style.Font.SetBold(true);
        summaryRange.Style.Fill.SetBackgroundColor(XLColor.FromHtml("#F1F5F9"));
        summaryRange.Style.Border.TopBorder = XLBorderStyleValues.Thin;
        summaryRange.Style.Border.BottomBorder = XLBorderStyleValues.Double;

        // Auto-fit & Freeze
        worksheet.SheetView.FreezeRows(4);
        worksheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
