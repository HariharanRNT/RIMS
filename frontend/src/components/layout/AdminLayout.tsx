import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AdminLayout: React.FC = () => {

  return (
    <div className="app-layout" style={{ background: 'var(--bg-app)', height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <Sidebar />
      <div className="main-content" style={{ background: 'var(--bg-app)', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', position: 'relative' }}>
        <main style={{ padding: '28px 36px 56px 36px', flex: 1, maxWidth: 'var(--content-max-width)', margin: '0 auto', width: '100%' }}>
          <Navbar />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

