import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { Shop } from '../../types';

type GuardState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'unverified'; shop: Shop }
  | { status: 'verified'; shop: Shop }
  | { status: 'error' };

export const VerifiedBusinessRoute: React.FC = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuthStore();
  const [state, setState] = useState<GuardState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    const loadShop = async () => {
      if (!user) {
        setState({ status: 'missing' });
        return;
      }

      setState({ status: 'loading' });
      try {
        const snapshot = await getDocs(
          query(collection(db, 'shops'), where('ownerId', '==', user.uid), limit(1)),
        );
        if (!active) return;
        if (snapshot.empty) {
          setState({ status: 'missing' });
          return;
        }

        const shop = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop;
        const approved = shop.verified === true && shop.verificationStatus === 'approved';
        setState(approved ? { status: 'verified', shop } : { status: 'unverified', shop });
      } catch (error) {
        console.error('Unable to verify business access:', error);
        if (active) setState({ status: 'error' });
      }
    };

    if (!authLoading) void loadShop();
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  if (authLoading || state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-9 h-9 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (state.status === 'missing') return <Navigate to="/business/create-shop" replace />;
  if (state.status === 'unverified') return <Navigate to="/business/verification" replace />;

  if (state.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Business access could not be verified</h1>
          <p className="mt-2 text-sm text-gray-600">Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
