import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from '../navigation/BottomNav';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isBusinessRoute = location.pathname.startsWith('/business');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className={`flex-1 flex flex-col min-h-screen ${isBusinessRoute ? 'lg:ml-72' : ''}`}>
          <main className={`flex-1 ${isBusinessRoute ? 'pb-6' : 'pb-20 lg:pb-6'}`}>
            <Outlet />
          </main>
        </div>
      </div>
      {!isBusinessRoute && <BottomNav className="lg:hidden" />}
    </div>
  );
};
