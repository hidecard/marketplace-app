import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Seller/onboarding boundary. Authentication is required, but shop approval is
 * deliberately not required here: the dashboard must explain the pending or
 * rejected state and link the owner to verification. Operational routes use
 * VerifiedBusinessRoute instead.
 */
export const SellerRoute: React.FC = () => {
  const location = useLocation();
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.status !== 'active') {
    return <Navigate to="/profile" replace state={{ accountRestricted: true }} />;
  }

  return <Outlet />;
};
