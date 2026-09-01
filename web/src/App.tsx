import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthLayout } from './pages/auth/AuthLayout';
import { ProtectedRoute } from './pages/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { HomePage } from './pages/home/HomePage';
import { CategoriesPage } from './pages/home/CategoriesPage';
import { CategoryDetailPage } from './pages/home/CategoryDetailPage';
import { ShopsPage } from './pages/shop/ShopsPage';
import { SearchPage } from './pages/search/SearchPage';
import { ProductDetailPage } from './pages/product/ProductDetailPage';
import { ShopPage } from './pages/shop/ShopPage';
import { OrdersPage } from './pages/orders/OrdersPage';
import { OrderDetailPage } from './pages/orders/OrderDetailPage';
import { ChatsPage } from './pages/chats/ChatsPage';
import { ChatDetailPage } from './pages/chats/ChatDetailPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { AddressesPage } from './pages/profile/AddressesPage';
import { PhoneVerificationPage } from './pages/profile/PhoneVerificationPage';
import { FavoritesPage } from './pages/home/FavoritesPage';
import { NotificationsPage } from './pages/home/NotificationsPage';
import { CartPage } from './pages/home/CartPage';
import { BusinessDashboardPage } from './pages/business/BusinessDashboardPage';
import { POSPage } from './pages/business/POSPage';
import { ProductFormPage } from './pages/business/ProductFormPage';
import { CreateShopPage } from './pages/business/CreateShopPage';
import { BusinessProductsPage } from './pages/business/BusinessProductsPage';
import { BusinessOrdersPage } from './pages/business/BusinessOrdersPage';
import { BusinessAnalyticsPage } from './pages/business/BusinessAnalyticsPage';
import { BusinessSettingsPage } from './pages/business/BusinessSettingsPage';
import { ShopVerificationPage } from './pages/business/ShopVerificationPage';
import { WriteReviewPage, ReportPage } from './pages/ReviewsPage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { OffersPage } from './pages/offers/OffersPage';
import { ExpensesPage } from './pages/business/ExpensesPage';
import { InventoryMovementsPage } from './pages/business/InventoryMovementsPage';
import { CustomersPage } from './pages/business/CustomersPage';
import { BusinessCategoriesPage } from './pages/business/BusinessCategoriesPage';
import { NotFoundPage } from './pages/not-found/NotFoundPage';
import { useAuth } from './hooks/useAuth';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

export const App: React.FC = () => {
  useAuth();

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <React.Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            {/* Home & Discovery */}
            <Route path="/" element={<HomePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:slug" element={<CategoryDetailPage />} />
            <Route path="/shops" element={<ShopsPage />} />
            <Route path="/search" element={<SearchPage />} />

            {/* Product & Shop */}
            <Route path="/product/:productId" element={<ProductDetailPage />} />
            <Route path="/shop/:shopId" element={<ShopPage />} />

            {/* Orders */}
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />

            {/* Chat */}
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chats/:chatId" element={<ChatDetailPage />} />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/verify-phone" element={<PhoneVerificationPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/offers" element={<OffersPage />} />

            {/* Business */}
            <Route path="/business" element={<BusinessDashboardPage />} />
            <Route path="/business/create-shop" element={<CreateShopPage />} />
            <Route path="/business/pos" element={<POSPage />} />
            <Route path="/business/products" element={<BusinessProductsPage />} />
            <Route path="/business/products/new" element={<ProductFormPage />} />
            <Route path="/business/products/:productId/edit" element={<ProductFormPage />} />
            <Route path="/business/orders" element={<BusinessOrdersPage />} />
            <Route path="/business/analytics" element={<BusinessAnalyticsPage />} />
            <Route path="/business/settings" element={<BusinessSettingsPage />} />
            <Route path="/business/verification" element={<ShopVerificationPage />} />
            <Route path="/business/expenses" element={<ExpensesPage />} />
            <Route path="/business/inventory" element={<InventoryMovementsPage />} />
            <Route path="/business/customers" element={<CustomersPage />} />
            <Route path="/business/categories" element={<BusinessCategoriesPage />} />

            {/* Reviews & Reports */}
            <Route path="/review/:orderId" element={<WriteReviewPage />} />
            <Route path="/report/:type/:id" element={<ReportPage />} />

            {/* Help */}
            <Route path="/help" element={<HelpSupportPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
};
