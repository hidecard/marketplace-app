import React from 'react';
import { MainLayout } from '../../components/layout/MainLayout';

export const NotFoundPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="p-4 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
        <p className="text-gray-600">Page not found</p>
      </div>
    </MainLayout>
  );
};
