import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PersistentActivityBar } from './PersistentActivityBar';

export const EmployeeLayout: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <PersistentActivityBar />
        <main style={{ padding: '1.5rem 2rem', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
