import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { EmployeeLayout } from './components/layout/EmployeeLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { DepartmentListPage } from './pages/admin/departments/DepartmentListPage';
import { DesignationListPage } from './pages/admin/designations/DesignationListPage';
import { EmployeeListPage } from './pages/admin/employees/EmployeeListPage';
import { SystemSettingsPage } from './pages/admin/settings/SystemSettingsPage';
import { LookupListPage } from './pages/admin/lookups/LookupListPage';
import { ProductListPage } from './pages/admin/products/ProductListPage';
import { ClientListPage } from './pages/admin/clients/ClientListPage';
import { ProductClientMappingPage } from './pages/admin/mappings/ProductClientMappingPage';
import { ApprovalsPage } from './pages/admin/approvals/ApprovalsPage';
import { PayrollProcessingPage } from './pages/admin/payroll/PayrollProcessingPage';
import { EmployeeSalaryStructurePage } from './pages/admin/payroll/EmployeeSalaryStructurePage';
import { MonthlyEmployeePayrollReportPage } from './pages/admin/payroll/MonthlyEmployeePayrollReportPage';
import { ReportsPage } from './pages/admin/reports/ReportsPage';
import { MonthlyCalendarPage } from './pages/admin/attendance/MonthlyCalendarPage';
import { AttendancePermissionsPage } from './pages/admin/attendance/AttendancePermissionsPage';
import { AdminNotificationsPage } from './pages/admin/notifications/AdminNotificationsPage';

import { UsersListPage } from './pages/admin/users/UsersListPage';
import { RolesListPage } from './pages/admin/roles/RolesListPage';
import { PermissionsManagementPage } from './pages/admin/permissions/PermissionsManagementPage';

import { EmployeeDashboardPage } from './pages/employee/DashboardPage';
import { WorkTaskPage } from './pages/employee/WorkTaskPage';
import { LeaveRequestPage } from './pages/employee/LeaveRequestPage';
import { PermissionRequestPage } from './pages/employee/PermissionRequestPage';
import { PayslipPage } from './pages/employee/PayslipPage';
import { ProfilePage } from './pages/employee/ProfilePage';
import { EmployeeCalendarPage } from './pages/employee/EmployeeCalendarPage';

import { TaskAllocationPage } from './pages/admin/tasks/TaskAllocationPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
          {/* Public / Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route
              path="attendance-permissions"
              element={
                <ProtectedRoute requiredPermissions={['Attendance.View', 'Permission.View', 'Report.View']}>
                  <AttendancePermissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="approvals"
              element={
                <ProtectedRoute requiredPermissions={['Leave.Approve', 'Permission.Approve', 'Attendance.Approve']}>
                  <ApprovalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll"
              element={
                <ProtectedRoute requiredPermissions={['Payroll.View', 'Payroll.Generate']}>
                  <PayrollProcessingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="salary-structure"
              element={
                <ProtectedRoute requiredPermissions={['SalaryStructure.View', 'SalaryStructure.Manage']}>
                  <EmployeeSalaryStructurePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/monthly-report"
              element={
                <ProtectedRoute requiredPermissions={['Payroll.View', 'Report.View']}>
                  <MonthlyEmployeePayrollReportPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute requiredPermission="Report.View">
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="tasks"
              element={
                <ProtectedRoute requiredPermissions={['Task.View', 'Task.Assign']}>
                  <TaskAllocationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="employees"
              element={
                <ProtectedRoute requiredPermission="Employee.View">
                  <EmployeeListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="departments"
              element={
                <ProtectedRoute requiredPermissions={['Department.View', 'Department.Manage']}>
                  <DepartmentListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="designations"
              element={
                <ProtectedRoute requiredPermissions={['Designation.View', 'Designation.Manage']}>
                  <DesignationListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products"
              element={
                <ProtectedRoute requiredPermissions={['MasterData.Manage', 'Employee.View']}>
                  <ProductListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="clients"
              element={
                <ProtectedRoute requiredPermissions={['MasterData.Manage', 'Employee.View']}>
                  <ClientListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mappings"
              element={
                <ProtectedRoute requiredPermissions={['MasterData.Manage', 'Employee.View']}>
                  <ProductClientMappingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="lookups"
              element={
                <ProtectedRoute requiredPermissions={['MasterData.Manage', 'Break.Manage', 'SupportActivity.Manage']}>
                  <LookupListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute requiredPermission="Settings.View">
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="attendance-calendar"
              element={
                <ProtectedRoute requiredPermissions={['AttendanceCalendar.View', 'AttendanceCalendar.Manage']}>
                  <MonthlyCalendarPage />
                </ProtectedRoute>
              }
            />
            <Route path="notifications" element={<AdminNotificationsPage />} />

            {/* RBAC Administration Routes */}
            <Route
              path="users"
              element={
                <ProtectedRoute requiredPermission="User.View">
                  <UsersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="roles"
              element={
                <ProtectedRoute requiredPermission="Role.View">
                  <RolesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="permissions"
              element={
                <ProtectedRoute requiredPermissions={['Role.Assign', 'SystemPermission.View', 'Role.View']}>
                  <PermissionsManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Employee Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['Employee']}>
                <EmployeeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="work-task" element={<WorkTaskPage />} />
            <Route path="leave" element={<LeaveRequestPage />} />
            <Route path="permission" element={<PermissionRequestPage />} />
            <Route path="payslip" element={<PayslipPage />} />
            <Route path="calendar" element={<EmployeeCalendarPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
};

export default App;
