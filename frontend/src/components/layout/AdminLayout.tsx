import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const AdminLayout: React.FC = () => {
  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar />
        <main style={{ padding: '26px 34px 50px 34px', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

