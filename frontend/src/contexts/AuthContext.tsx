import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useHeartbeat } from '../hooks/useHeartbeat';

interface User {
  token: string;
  role: 'Admin' | 'Employee';
  mustChangePassword: boolean;
  employeeId: number;
  employeeName: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  role: 'Admin' | 'Employee' | null;
  mustChangePassword: boolean;
  updateMustChangePassword: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('riims_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Attach 60-second non-destructive heartbeat
  useHeartbeat(!!user);

  // Validate server state on boot
  useEffect(() => {
    if (user) {
      apiClient.get('/sessions/current-state').catch(() => {
        // Interceptor will handle 401 if session is expired or belongs to previous workday
      });
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
      if (user?.role === 'Employee') {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        role: user?.role || null,
        mustChangePassword: user?.mustChangePassword || false,
        updateMustChangePassword,
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
