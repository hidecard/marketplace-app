import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Heart,
  ShoppingBag,
  MessageCircle,
  User,
  Store,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  FolderTree,
  FileText,
  LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface SidebarItem {
  path: string;
  icon: LucideIcon;
  label: string;
  section?: 'marketplace' | 'business';
}

const marketplaceItems: SidebarItem[] = [
  { path: '/', icon: Home, label: 'Home', section: 'marketplace' },
  { path: '/search', icon: Search, label: 'Search', section: 'marketplace' },
  { path: '/favorites', icon: Heart, label: 'Favorites', section: 'marketplace' },
  { path: '/orders', icon: ShoppingBag, label: 'My Orders', section: 'marketplace' },
  { path: '/chats', icon: MessageCircle, label: 'Messages', section: 'marketplace' },
  { path: '/profile', icon: User, label: 'Profile', section: 'marketplace' },
];

const businessItems: SidebarItem[] = [
  { path: '/business', icon: Store, label: 'Dashboard', section: 'business' },
  { path: '/business/pos', icon: DollarSign, label: 'POS', section: 'business' },
  { path: '/business/products', icon: Package, label: 'Products', section: 'business' },
  { path: '/business/orders', icon: ShoppingBag, label: 'Orders', section: 'business' },
  { path: '/business/analytics', icon: BarChart3, label: 'Analytics', section: 'business' },
  { path: '/business/reports', icon: FileText, label: 'Reports', section: 'business' },
  { path: '/business/categories', icon: FolderTree, label: 'Categories', section: 'business' },
  { path: '/business/settings', icon: Settings, label: 'Settings', section: 'business' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const [hasShop, setHasShop] = React.useState(false);
  const [checkingShop, setCheckingShop] = React.useState(true);

  React.useEffect(() => {
    const checkShop = async () => {
      if (!user) {
        setHasShop(false);
        setCheckingShop(false);
        return;
      }
      try {
        const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        setHasShop(!snapshot.empty);
      } catch (error) {
        console.error('Error checking shop:', error);
        setHasShop(false);
      } finally {
        setCheckingShop(false);
      }
    };
    checkShop();
  }, [user]);

  const isBusinessRoute = location.pathname.startsWith('/business');
  const shouldShowBusiness = isBusinessRoute && hasShop;
  const shouldShowMarketplace = !isBusinessRoute;

  const renderItems = (items: SidebarItem[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setSidebarOpen(false)}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <Icon size={20} />
          <span className="font-medium">{item.label}</span>
        </Link>
      );
    });
  };

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Store className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-gray-900">
                {shouldShowBusiness ? 'Business' : 'Marketplace'}
              </span>
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {checkingShop ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div>
            ) : (
              <>
                {shouldShowMarketplace && (
                  <div className="space-y-1">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Marketplace
                    </p>
                    {renderItems(marketplaceItems)}
                  </div>
                )}
                {shouldShowBusiness && (
                  <div className="space-y-1">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Business
                    </p>
                    {renderItems(businessItems)}
                  </div>
                )}
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
};
