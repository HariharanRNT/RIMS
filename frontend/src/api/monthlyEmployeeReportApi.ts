import apiClient from './client';

export interface MonthlyEmployeePayrollReportItem {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  department?: string;
  designation?: string;
  year: number;
  month: number;
  monthName: string;
  payrollStatus: string;
  workingDays: number;
  presentDays: number;
  approvedLeaveDays: number;
  monthlyAllowedLeave: number;
  sandwichLeaveDays: number;
  weekendDays: number;
  holidayDays: number;
  permissionCount: number;
  lateLoginCount: number;
  lateLoginLOPDays: number;
  leaveLOPDays: number;
  totalLOPDays: number;
  monthlySalary: number;
  dailySalary: number;
  lopAmount: number;
  totalDeduction: number;
  finalSalary: number;
}

export const monthlyEmployeeReportApi = {
  getMonthlyEmployeeReport: async (year: number, month: number, page: number = 1, pageSize: number = 25, search?: string) => {
    const response = await apiClient.get('/payroll/monthly-report', {
      params: { year, month, page, pageSize, search },
    });
    return response.data;
  },

  downloadMonthlyEmployeeReport: async (year: number, month: number) => {
    const response = await apiClient.get('/payroll/monthly-report/export', {
      params: { year, month },
      responseType: 'blob',
    });
    return response.data;
  },
};
