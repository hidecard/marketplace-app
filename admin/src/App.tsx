import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './pages/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ShopsPage } from './pages/ShopsPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { VerificationsPage } from './pages/VerificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { BannersPage } from './pages/BannersPage';
import { SettingsPage } from './pages/SettingsPage';
import { CategoriesPage } from './pages/CategoriesPage';

export const App: React.FC = () => {
  useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/shops" element={<ShopsPage />} />
          <Route path="/admin/products" element={<ProductsPage />} />
          <Route path="/admin/orders" element={<OrdersPage />} />
          <Route path="/admin/verifications" element={<VerificationsPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/categories" element={<CategoriesPage />} />
          <Route path="/admin/banners" element={<BannersPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
