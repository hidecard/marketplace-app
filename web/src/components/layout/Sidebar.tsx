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
  FileText,
  Boxes,
  Receipt,
  Users,
  FolderTree,
  ShieldCheck,
  Tag,
  ArrowRightLeft,
  ShoppingBasket,
  HelpCircle,
  Globe,
  PlusCircle,
  LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

type ShopAccess = 'none' | 'pending' | 'rejected' | 'approved';

interface SidebarItem {
  path: string;
  icon: LucideIcon;
  labelKey: string;
  fallbackLabel: string;
  section?: 'marketplace' | 'business';
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { language, toggleLanguage, t } = useLanguage();
  const [shopAccess, setShopAccess] = React.useState<ShopAccess>('none');
  const [checkingShop, setCheckingShop] = React.useState(true);

  const marketplaceItems: SidebarItem[] = [
    { path: '/', icon: Home, labelKey: 'home', fallbackLabel: 'Home', section: 'marketplace' },
    { path: '/categories', icon: FolderTree, labelKey: 'categories', fallbackLabel: 'Categories', section: 'marketplace' },
    { path: '/shops', icon: Store, labelKey: 'verifiedShops', fallbackLabel: 'Explore Shops', section: 'marketplace' },
    { path: '/search', icon: Search, labelKey: 'search', fallbackLabel: 'Search', section: 'marketplace' },
    { path: '/sell', icon: PlusCircle, labelKey: 'sell', fallbackLabel: 'Sell Item', section: 'marketplace' },
    { path: '/offers', icon: Tag, labelKey: 'makeOffer', fallbackLabel: 'Special Offers', section: 'marketplace' },
    { path: '/favorites', icon: Heart, labelKey: 'favorites', fallbackLabel: 'Favorites', section: 'marketplace' },
    { path: '/orders', icon: ShoppingBag, labelKey: 'myOrders', fallbackLabel: 'My Orders', section: 'marketplace' },
    { path: '/chats', icon: MessageCircle, labelKey: 'chats', fallbackLabel: 'Messages', section: 'marketplace' },
    { path: '/help', icon: HelpCircle, labelKey: 'help', fallbackLabel: 'Help & Support', section: 'marketplace' },
    { path: '/profile', icon: User, labelKey: 'profile', fallbackLabel: 'Profile', section: 'marketplace' },
  ];

  const businessItems: SidebarItem[] = [
    { path: '/business', icon: Store, labelKey: 'businessMode', fallbackLabel: 'Dashboard', section: 'business' },
    { path: '/business/pos', icon: DollarSign, labelKey: 'pos', fallbackLabel: 'POS Register', section: 'business' },
    { path: '/business/products', icon: Package, labelKey: 'products', fallbackLabel: 'Products', section: 'business' },
    { path: '/business/inventory', icon: Boxes, labelKey: 'inventory', fallbackLabel: 'Inventory', section: 'business' },
    { path: '/business/orders', icon: ShoppingBag, labelKey: 'orders', fallbackLabel: 'Customer Orders', section: 'business' },
    { path: '/business/expenses', icon: Receipt, labelKey: 'expenses', fallbackLabel: 'Expenses', section: 'business' },
    { path: '/business/customers', icon: Users, labelKey: 'customers', fallbackLabel: 'Customers', section: 'business' },
    { path: '/business/analytics', icon: BarChart3, labelKey: 'analytics', fallbackLabel: 'Analytics', section: 'business' },
    { path: '/business/reports', icon: FileText, labelKey: 'grossProfit', fallbackLabel: 'Reports & P&L', section: 'business' },
    { path: '/business/verification', icon: ShieldCheck, labelKey: 'verifiedShops', fallbackLabel: 'Verification', section: 'business' },
    { path: '/business/settings', icon: Settings, labelKey: 'settings', fallbackLabel: 'Settings', section: 'business' },
  ];

  React.useEffect(() => {
    const checkShop = async () => {
      if (!user) {
        setShopAccess('none');
        setCheckingShop(false);
        return;
      }
      try {
        const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setShopAccess('none');
        } else {
          const shop = snapshot.docs[0].data();
          setShopAccess(
            shop.verified === true && shop.verificationStatus === 'approved'
              ? 'approved'
              : shop.verificationStatus === 'rejected'
                ? 'rejected'
                : 'pending',
          );
        }
      } catch (error) {
        console.error('Error checking shop:', error);
        setShopAccess('none');
      } finally {
        setCheckingShop(false);
      }
    };
    checkShop();
  }, [user]);

  const isBusinessRoute = location.pathname.startsWith('/business');

  const renderItems = (items: SidebarItem[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;
      const label = t(item.labelKey as any) || item.fallbackLabel;
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
          <span className="font-medium">{label}</span>
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
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Store className="text-white" size={24} />
                </div>
                <div>
                  <span className="text-lg font-bold text-gray-900 block leading-tight">
                    {isBusinessRoute ? (language === 'my' ? 'စီးပွားရေးဆိုင်ရာ' : 'Shop Hub') : (language === 'my' ? 'ပဒေသာပင်' : 'Marketplace')}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {isBusinessRoute ? (language === 'my' ? 'အရောင်းမုဒ်' : 'Business Mode') : (language === 'my' ? 'ဈေးဝယ်မုဒ်' : 'Shopping Mode')}
                  </span>
                </div>
              </Link>
              {/* Language Switch button in sidebar */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700"
                title={language === 'my' ? 'Switch to English' : 'မြန်မာဘာသာ'}
              >
                <Globe size={13} className="text-primary-600" />
                <span>{language === 'my' ? 'မြန်မာ' : 'EN'}</span>
              </button>
            </div>

            {/* Quick Mode Switcher */}
            <div className="mt-3">
              {isBusinessRoute ? (
                <Link
                  to="/"
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  <ShoppingBasket size={15} />
                  <span>{language === 'my' ? 'ဈေးဝယ်မုဒ်သို့ ကူးပြောင်းမည်' : 'Switch to Marketplace'}</span>
                </Link>
              ) : (
                <Link
                  to={
                    shopAccess === 'approved'
                      ? '/business'
                      : shopAccess === 'none'
                        ? '/business/create-shop'
                        : '/business/verification'
                  }
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold rounded-lg transition-colors border border-primary-200"
                >
                  <ArrowRightLeft size={15} />
                  <span>
                    {shopAccess === 'approved'
                      ? (language === 'my' ? 'စီးပွားရေးမုဒ်သို့ ကူးမည်' : 'Switch to Business Mode')
                      : shopAccess === 'none'
                        ? (language === 'my' ? 'ဆိုင်ဖွင့်မည် / ရောင်းချမည်' : 'Open Shop / Seller Mode')
                        : (language === 'my' ? 'ဆိုင်အတည်ပြုမှု ကြည့်မည်' : 'View Verification Status')}
                  </span>
                </Link>
              )}
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            {checkingShop ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">{t('loading')}</div>
            ) : (
              <>
                {!isBusinessRoute && (
                  <div className="space-y-1">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {language === 'my' ? 'ဈေးကွက်လမ်းညွှန်' : 'Marketplace'}
                    </p>
                    {renderItems(marketplaceItems)}
                  </div>
                )}
                {isBusinessRoute && (
                  <div className="space-y-1">
                    <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {language === 'my' ? 'အရောင်းနှင့် ဆိုင်စီမံခန့်ခွဲမှု' : 'Seller Tools & Management'}
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
