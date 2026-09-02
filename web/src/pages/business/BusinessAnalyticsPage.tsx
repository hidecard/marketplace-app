import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Package, Eye, Menu } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Order, POSSale, Shop } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export const BusinessAnalyticsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalViews: 0,
    avgOrderValue: 0,
    conversionRate: 0,
  });
  const [recentSales, setRecentSales] = useState<(Order | POSSale)[]>([]);

  useEffect(() => {
    if (user) {
      fetchShop();
    }
  }, [user]);

  useEffect(() => {
    if (shop) {
      fetchAnalytics();
    }
  }, [shop]);

  const fetchShop = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setShop({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop);
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      // Fetch orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('shopId', '==', shop.id),
        where('status', 'in', ['confirmed', 'completed', 'delivered'])
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));

      // Fetch POS sales
      const posQuery = query(
        collection(db, 'pos_sales'),
        where('shopId', '==', shop.id)
      );
      const posSnapshot = await getDocs(posQuery);
      const posData = posSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as POSSale));

      // Fetch products
      const productsQuery = query(
        collection(db, 'products'),
        where('shopId', '==', shop.id)
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));

      // Calculate stats
      const totalRevenue = [...ordersData, ...posData].reduce((sum, item) => sum + (item.total || 0), 0);
      const totalViews = productsData.reduce((sum, p) => sum + (p.views || 0), 0);
      const totalOrders = ordersData.length + posData.length;

      setStats({
        totalRevenue,
        totalOrders,
        totalProducts: productsData.length,
        totalViews,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        conversionRate: totalViews > 0 ? (totalOrders / totalViews) * 100 : 0,
      });

      // Combine and sort recent sales
      const allSales = [...ordersData, ...posData].sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });
      setRecentSales(allSales.slice(0, 10));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => useUIStore.getState().toggleSidebar()}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center">
              <Link to="/business" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={22} />
              </Link>
              <h1 className="ml-2 text-lg font-semibold">Analytics</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stats.totalOrders}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stats.totalProducts}</p>
                    <p className="text-xs text-gray-500">Products</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Eye className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{stats.totalViews}</p>
                    <p className="text-xs text-gray-500">Total Views</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-white rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Order Value</span>
                  <span className="font-medium text-gray-900">{formatCurrency(stats.avgOrderValue)} Ks</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="font-medium text-gray-900">{stats.conversionRate.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Revenue per View</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(stats.totalViews > 0 ? stats.totalRevenue / stats.totalViews : 0)} Ks
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-xl">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Recent Sales</h3>
              </div>
              {recentSales.length === 0 ? (
                <div className="p-8 text-center">
                  <TrendingUp className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-gray-500">No sales yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentSales.map((sale, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {'orderNumber' in sale ? `#${sale.orderNumber}` : 'POS Sale'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {sale.items?.length || 1} items
                        </p>
                      </div>
                      <span className="font-semibold text-primary-600">{formatCurrency(sale.total)} Ks</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
