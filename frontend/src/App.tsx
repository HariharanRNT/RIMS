import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { EmployeeLayout } from './components/layout/EmployeeLayout';

import { LoginPage } from './pages/auth/LoginPage';
import { ChangePasswordPage } from './pages/auth/ChangePasswordPage';

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
import { ReportsPage } from './pages/admin/reports/ReportsPage';

import { EmployeeDashboardPage } from './pages/employee/DashboardPage';
import { WorkTaskPage } from './pages/employee/WorkTaskPage';
import { LeaveRequestPage } from './pages/employee/LeaveRequestPage';
import { PermissionRequestPage } from './pages/employee/PermissionRequestPage';
import { PayslipPage } from './pages/employee/PayslipPage';
import { ProfilePage } from './pages/employee/ProfilePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth */}
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="payroll" element={<PayrollProcessingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="employees" element={<EmployeeListPage />} />
            <Route path="departments" element={<DepartmentListPage />} />
            <Route path="designations" element={<DesignationListPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="clients" element={<ClientListPage />} />
            <Route path="mappings" element={<ProductClientMappingPage />} />
            <Route path="lookups" element={<LookupListPage />} />
            <Route path="settings" element={<SystemSettingsPage />} />
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
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
