import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
  requiredPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  requiredPermissions,
}) => {
  const { isAuthenticated, role, roles, isAdmin, isEmployee, isPureAdmin, mustChangePassword, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Role verification
  if (allowedRoles && allowedRoles.length > 0) {
    const isRoleMatch = allowedRoles.some((allowed) => {
      if (allowed === 'Admin') return isPureAdmin || isAdmin;
      if (allowed === 'Employee') return isEmployee || role === 'Employee';
      return roles.includes(allowed) || role === allowed;
    });

    if (!isRoleMatch) {
      return <Navigate to={isPureAdmin ? '/admin/dashboard' : '/dashboard'} replace />;
    }
  }

  // Permission verification
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>403 — Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          You do not have permission (<code>{requiredPermission}</code>) to view this section.
        </p>
      </div>
    );
  }

  if (requiredPermissions && requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions)) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>403 — Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          You do not have the required permissions to view this section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
