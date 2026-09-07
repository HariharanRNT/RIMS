import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PersistentActivityBar } from './PersistentActivityBar';
import { useIdleReminders } from '../../hooks/useIdleReminders';

export const EmployeeLayout: React.FC = () => {
  useIdleReminders();

  return (
    <div className="app-layout" style={{ background: 'var(--bg-app)', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg-app)', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', position: 'relative' }}>
        <div className="sticky-top-nav-group" style={{ position: 'sticky', top: 0, zIndex: 90, background: 'var(--panel)' }}>
          <Header />
          <PersistentActivityBar />
        </div>
        <main style={{ padding: '1.65rem 2.25rem', flex: 1, background: 'var(--bg-app)', maxWidth: 'var(--content-max-width)', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
