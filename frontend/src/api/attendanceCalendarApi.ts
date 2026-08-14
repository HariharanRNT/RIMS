import apiClient from './client';

export const AttendanceDayType = {
  WorkingDay: 0,
  Weekend: 1,
  CompanyHoliday: 2,
  OptionalHoliday: 3,
  SpecialWorkingDay: 4,
} as const;

export type AttendanceDayType = (typeof AttendanceDayType)[keyof typeof AttendanceDayType];

export interface AttendanceCalendarDto {
  id: number;
  calendarDate: string;
  year: number;
  month: number;
  dayType: AttendanceDayType;
  dayTypeName: string;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  description?: string;
  isPublished: boolean;
  publishedBy?: number;
  publishedAt?: string;
  lastModifiedBy?: number;
  lastModifiedAt?: string;
  loginRequired: boolean;
}

export interface MonthCalendarStatusDto {
  year: number;
  month: number;
  status: string;
  isGenerated: boolean;
  isPublished: boolean;
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  companyHolidays: number;
  optionalHolidays: number;
  specialWorkingDays: number;
  publishedBy?: number;
  publishedByName?: string;
  publishedAt?: string;
}

export interface AttendanceCalendarAuditDto {
  id: number;
  attendanceCalendarId: number;
  calendarDate: string;
  oldDayType: AttendanceDayType;
  oldDayTypeName: string;
  newDayType: AttendanceDayType;
  newDayTypeName: string;
  oldHolidayName?: string;
  newHolidayName?: string;
  changedByUserId: number;
  changedByUserName?: string;
  changedAt: string;
  reasonForChange: string;
}

export interface EmployeeDailyAttendanceSummaryDto {
  date: string;
  dayType: AttendanceDayType;
  dayTypeName: string;
  isWorkingDay: boolean;
  holidayName?: string;
  status: string;
  loginTime?: string;
  logoutTime?: string;
  isLate: boolean;
  isPermission: boolean;
  permissionHours: number;
  isLeave: boolean;
  isSandwichLeave: boolean;
  isLop: boolean;
  lopReason?: string;
  leaveReason?: string;
}

export interface EmployeeMonthlyAttendanceReportDto {
  employeeId: number;
  year: number;
  month: number;
  totalCalendarDays: number;
  workingDays: number;
  presentDays: number;
  approvedLeaveDays: number;
  weekendDays: number;
  holidayDays: number;
  monthlyAllowedLeave: number;
  actualLeaveDays: number;
  sandwichLeaveDays: number;
  totalLeaveLOPDays: number;
  leaveLOPDays: number;
  unpermissionedLateCount: number;
  lateLoginLOPDays: number;
  totalLOPDays: number;
  dailySalary: number;
  totalLOPAmount: number;
  dailySummaries: EmployeeDailyAttendanceSummaryDto[];
}

export interface UpdateCalendarDayRequest {
  id: number;
  dayType: AttendanceDayType;
  holidayName?: string;
  description?: string;
  reasonForChange?: string;
}

export const attendanceCalendarApi = {
  getMonthlyCalendar: async (year: number, month: number) => {
    const response = await apiClient.get<{ data: AttendanceCalendarDto[] }>(`/attendance-calendar/${year}/${month}`);
    return response.data.data;
  },

  getCalendarStatus: async (year: number, month: number) => {
    const response = await apiClient.get<{ data: MonthCalendarStatusDto }>(`/attendance-calendar/${year}/${month}/status`);
    return response.data.data;
  },

  generateCalendar: async (year: number, month: number) => {
    const response = await apiClient.post<{ data: AttendanceCalendarDto[] }>('/attendance-calendar/generate', { year, month });
    return response.data.data;
  },

  updateCalendarDay: async (id: number, request: UpdateCalendarDayRequest) => {
    const response = await apiClient.put<{ data: AttendanceCalendarDto }>(`/attendance-calendar/${id}`, request);
    return response.data.data;
  },

  changePublishedCalendarDay: async (id: number, request: UpdateCalendarDayRequest) => {
    const response = await apiClient.post<{ data: AttendanceCalendarDto }>(`/attendance-calendar/${id}/change`, request);
    return response.data.data;
  },

  publishCalendar: async (year: number, month: number) => {
    const response = await apiClient.post<{ data: MonthCalendarStatusDto }>(`/attendance-calendar/${year}/${month}/publish`);
    return response.data.data;
  },

  getAuditLogs: async (id: number) => {
    const response = await apiClient.get<{ data: AttendanceCalendarAuditDto[] }>(`/attendance-calendar/${id}/audits`);
    return response.data.data;
  },

  getEmployeeMonthlyAttendance: async (year: number, month: number, employeeId?: number) => {
    const response = await apiClient.get<{ data: EmployeeDailyAttendanceSummaryDto[] }>(
      `/attendance-calendar/employee/${year}/${month}`,
      { params: { employeeId } }
    );
    return response.data.data;
  },

  getEmployeeMonthlyAttendanceReport: async (year: number, month: number, employeeId?: number) => {
    const response = await apiClient.get<{ data: EmployeeMonthlyAttendanceReportDto }>(
      `/attendance-calendar/employee/${year}/${month}/report`,
      { params: { employeeId } }
    );
    return response.data.data;
  },
};
