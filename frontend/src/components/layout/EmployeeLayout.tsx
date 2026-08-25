import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PersistentActivityBar } from './PersistentActivityBar';

export const EmployeeLayout: React.FC = () => {
  return (
    <div className="app-layout" style={{ background: 'var(--bg-app)', minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg-app)', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <PersistentActivityBar />
        <main style={{ padding: '1.5rem 2rem', flex: 1, background: 'var(--bg-app)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
