import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, ShoppingCart, Search, Globe } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useLanguage } from '../../context/LanguageContext';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { toggleSidebar } = useUIStore();
  const { language, toggleLanguage, t } = useLanguage();
  const location = useLocation();

  const getPageTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path === '/') return t('marketplace');
    if (path === '/search') return t('search');
    if (path === '/favorites') return t('favorites');
    if (path === '/orders') return t('myOrders');
    if (path === '/chats') return t('chats');
    if (path === '/profile') return t('profile');
    if (path === '/sell') return t('sell');
    return t('marketplace');
  };

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            id="header-lang-toggle"
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
            title={language === 'my' ? 'Switch to English' : 'မြန်မာဘာသာသို့ ပြောင်းမည်'}
          >
            <Globe size={14} className="text-primary-600" />
            <span>{language === 'my' ? 'မြန်မာ' : 'EN'}</span>
          </button>

          <Link to="/search" className="p-2 rounded-lg hover:bg-gray-100" aria-label="Search">
            <Search size={22} />
          </Link>
          <Link to="/notifications" className="p-2 rounded-lg hover:bg-gray-100 relative" aria-label="Notifications">
            <Bell size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Link>
          <Link to="/cart" className="p-2 rounded-lg hover:bg-gray-100 relative" aria-label="Cart">
            <ShoppingCart size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
};

