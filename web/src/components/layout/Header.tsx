import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, ShoppingCart, Search } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { toggleSidebar } = useUIStore();
  const location = useLocation();

  const getPageTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path === '/') return 'Marketplace';
    if (path === '/search') return 'Search';
    if (path === '/favorites') return 'Favorites';
    if (path === '/orders') return 'My Orders';
    if (path === '/chats') return 'Messages';
    if (path === '/profile') return 'Profile';
    return 'Marketplace';
  };

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/search" className="p-2 rounded-lg hover:bg-gray-100">
            <Search size={22} />
          </Link>
          <Link to="/notifications" className="p-2 rounded-lg hover:bg-gray-100 relative">
            <Bell size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Link>
          <Link to="/cart" className="p-2 rounded-lg hover:bg-gray-100 relative">
            <ShoppingCart size={22} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
          </Link>
        </div>
      </div>
    </header>
  );
};
