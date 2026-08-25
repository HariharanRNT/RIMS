import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';
import { useHeartbeat } from '../hooks/useHeartbeat';

export interface User {
  token: string;
  role: string;
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  mustChangePassword: boolean;
  employeeId: number;
  employeeName: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  role: string | null;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  updateMustChangePassword: (val: boolean) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('riims_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Attach 60-second non-destructive heartbeat
  useHeartbeat(!!user);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data.success) {
        const profile = response.data.data;
        setUser((prev) => {
          if (!prev) return null;
          const updated: User = {
            ...prev,
            role: profile.primaryRole,
            roles: profile.roles || [],
            permissions: profile.permissions || [],
            isSuperAdmin: profile.isSuperAdmin || false,
            mustChangePassword: profile.mustChangePassword,
            employeeId: profile.employeeId,
            employeeName: profile.employeeName,
          };
          localStorage.setItem('riims_user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch {
      // Ignore refresh error
    }
  }, []);

  // Validate server state & refresh profile on boot
  useEffect(() => {
    if (user) {
      apiClient.get('/sessions/current-state').catch(() => {
        // Interceptor will handle 401 if session is expired
      });
      refreshUser();
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data.success) {
      const userData: User = response.data.data;
      localStorage.setItem('riims_token', userData.token);
      localStorage.setItem('riims_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      if (user?.role === 'Employee' || (user?.roles && user.roles.includes('Employee') && user.roles.length === 1)) {
        await apiClient.post('/attendance/logout');
      }
    } catch {
      // Proceed with local logout regardless of API failure
    } finally {
      localStorage.removeItem('riims_token');
      localStorage.removeItem('riims_user');
      setUser(null);
    }
  };

  const updateMustChangePassword = (val: boolean) => {
    if (user) {
      const updated = { ...user, mustChangePassword: val };
      localStorage.setItem('riims_user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  const userRoles = user?.roles || (user?.role ? [user.role] : []);
  const userPermissions = user?.permissions || [];
  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    userRoles.some(r => r.toLowerCase() === 'super admin' || r.toLowerCase() === 'admin') ||
    user?.role?.toLowerCase() === 'admin' ||
    user?.role?.toLowerCase() === 'super admin'
  );
  const isAdmin = Boolean(
    isSuperAdmin ||
    userRoles.some(r => r.toLowerCase().endsWith('admin') || r.toLowerCase() === 'admin') ||
    user?.role?.toLowerCase().endsWith('admin')
  );

  const hasRole = useCallback((roleName: string): boolean => {
    if (isSuperAdmin && roleName !== 'Employee') return true;
    return userRoles.some(r => r.toLowerCase() === roleName.toLowerCase());
  }, [userRoles, isSuperAdmin]);

  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (isSuperAdmin) return true;
    return userPermissions.includes(permissionCode);
  }, [userPermissions, isSuperAdmin]);

  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    if (isSuperAdmin) return true;
    if (!permissionCodes || permissionCodes.length === 0) return true;
    return permissionCodes.some(p => userPermissions.includes(p));
  }, [userPermissions, isSuperAdmin]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        role: user?.role || null,
        roles: userRoles,
        permissions: userPermissions,
        isSuperAdmin,
        isAdmin,
        mustChangePassword: user?.mustChangePassword || false,
        updateMustChangePassword,
        hasPermission,
        hasAnyPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
