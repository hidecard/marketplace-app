import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Heart, MapPin, Store, LogOut, ChevronRight, Bell, Shield, HelpCircle, Settings, Edit } from 'lucide-react';
import { auth, db } from '../../services/firebase';
import { useAuthStore } from '../../stores/authStore';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [userStats, setUserStats] = useState({ orders: 0, favorites: 0 });

  useEffect(() => {
    fetchUserStats();
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      // Fetch user stats from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserStats({
          orders: data.orderCount || 0,
          favorites: data.favoriteCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const menuItems = [
    { icon: ShoppingBag, label: 'My Orders', path: '/orders', color: 'text-blue-600', desc: 'Track your orders' },
    { icon: Heart, label: 'Favorites', path: '/favorites', color: 'text-red-600', desc: 'Saved products' },
    { icon: MapPin, label: 'My Addresses', path: '/addresses', color: 'text-green-600', desc: 'Delivery addresses' },
    { icon: Store, label: 'My Shop', path: '/business', color: 'text-purple-600', desc: user?.shopVerified ? 'Verified seller' : 'Create or manage shop' },
    { icon: Bell, label: 'Notifications', path: '/notifications', color: 'text-orange-600', desc: 'Alerts & updates' },
    { icon: Shield, label: 'Verification', path: '/business/verification', color: 'text-indigo-600', desc: 'Get verified badge' },
    { icon: HelpCircle, label: 'Help & Support', path: '/help', color: 'text-gray-600', desc: 'FAQs & contact' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center">
            <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">Profile</h1>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-100">
            <Settings size={22} className="text-gray-600" />
          </button>
        </div>
      </header>

      <div className="p-4">
        {/* User Info Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-6 mb-4 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/50">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold">
                  {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.displayName || 'User'}</h2>
              <p className="text-primary-100">{user?.email}</p>
              {user?.phoneNumber && (
                <p className="text-sm text-primary-200">{user.phoneNumber}</p>
              )}
            </div>
            <button className="p-2 bg-white/20 rounded-full hover:bg-white/30">
              <Edit size={18} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold">{userStats.orders}</p>
              <p className="text-xs text-primary-200">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{userStats.favorites}</p>
              <p className="text-xs text-primary-200">Favorites</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{user?.shopVerified ? '✓' : '—'}</p>
              <p className="text-xs text-primary-200">Verified</p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        {user && !user.phoneVerified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Shield className="text-yellow-600 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">Verify your phone number</p>
              <p className="text-xs text-yellow-600">Unlock all features by verifying your phone</p>
            </div>
            <Link
              to="/verify-phone"
              className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg"
            >
              Verify
            </Link>
          </div>
        )}

        {/* Shop Status */}
        {user && !user.shopVerified && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Store className="text-purple-600 flex-shrink-0" size={24} />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-800">Start selling today!</p>
              <p className="text-xs text-purple-600">Create your shop and reach thousands of customers</p>
            </div>
            <Link
              to="/business/create-shop"
              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
            >
              Create Shop
            </Link>
          </div>
        )}

        {/* Menu Items */}
        <div className="bg-white rounded-xl overflow-hidden mb-4 shadow-sm">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ${item.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{item.label}</span>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-xl px-4 py-4 flex items-center gap-4 text-red-600 hover:bg-red-50 shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <LogOut size={20} />
          </div>
          <span className="font-medium">Logout</span>
        </button>

        {/* App Version */}
        <p className="text-center text-xs text-gray-400 mt-6">Marketplace v1.0.0</p>
      </div>
    </div>
  );
};
