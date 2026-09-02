import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
          <p className="text-gray-600 mb-6">Page not found</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-medium"
          >
            <Home size={18} />
            Go Home
          </Link>
        </div>
      </main>
    </div>
  );
};
