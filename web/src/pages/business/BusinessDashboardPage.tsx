import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, DollarSign, ShoppingBag, TrendingUp, Plus, BarChart3, FolderTree, FileText, Menu } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Shop, Order, POSSale } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

export const BusinessDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalSales: 0,
    revenue: 0,
  });

  useEffect(() => {
    if (user) {
      fetchShop();
    }
  }, [user]);

  useEffect(() => {
    if (shop) {
      fetchDashboardData();
    }
  }, [shop]);

  const fetchShop = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const shopData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop;
        setShop(shopData);
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!shop) return;
    try {
      // Fetch products
      const productsQuery = query(
        collection(db, 'products'),
        where('shopId', '==', shop.id),
        orderBy('createdAt', 'desc')
      );
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData.slice(0, 5));

      // Fetch orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('shopId', '==', shop.id),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData.slice(0, 5));

      // Fetch POS sales
      const posQuery = query(
        collection(db, 'pos_sales'),
        where('shopId', '==', shop.id),
        orderBy('createdAt', 'desc')
      );
      const posSnapshot = await getDocs(posQuery);
      const posData = posSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as POSSale));

      // Calculate stats
      const totalRevenue = [...ordersData, ...posData].reduce((sum, item) => sum + (item.total || 0), 0);
      setStats({
        totalProducts: productsData.length,
        totalOrders: ordersData.length,
        totalSales: posData.length,
        revenue: totalRevenue,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (!shop && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Business Mode</h1>
        </header>
        <div className="p-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-primary-600" size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Your Shop</h2>
            <p className="text-gray-500 mb-6">
              Start selling on Marketplace and manage your business with powerful tools
            </p>
            <Link
              to="/business/create-shop"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Plus size={20} />
              Create Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{shop?.name || 'Business'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/business/pos"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <DollarSign size={18} />
              <span className="hidden sm:inline">POS</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="p-4">
        {/* Verification Status */}
        {shop?.verificationStatus !== 'approved' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-yellow-800">
              {shop?.verificationStatus === 'pending'
                ? 'Your shop verification is pending. We will review it soon.'
                : shop?.verificationStatus === 'rejected'
                ? 'Your shop verification was rejected. Please submit again.'
                : 'Verify your shop to get a verified badge and build trust with buyers.'}
            </p>
            {shop?.verificationStatus !== 'pending' && (
              <Link
                to="/business/verification"
                className="text-sm text-yellow-800 font-medium underline mt-2 inline-block"
              >
                {shop?.verificationStatus === 'rejected' ? 'Submit Again' : 'Verify Now'}
              </Link>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                <p className="text-xs text-gray-500">Products</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingBag className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                <p className="text-xs text-gray-500">Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
                <p className="text-xs text-gray-500">POS Sales</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue)}</p>
                <p className="text-xs text-gray-500">Revenue (Ks)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <Link to="/business/products/new" className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <Plus className="text-primary-600" size={20} />
            </div>
            <span className="text-xs text-gray-600 text-center">Add Product</span>
          </Link>
          <Link to="/business/pos" className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <span className="text-xs text-gray-600 text-center">New Sale</span>
          </Link>
          <Link to="/business/orders" className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="text-blue-600" size={20} />
            </div>
            <span className="text-xs text-gray-600 text-center">Orders</span>
          </Link>
          <Link to="/business/analytics" className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <BarChart3 className="text-purple-600" size={20} />
            </div>
            <span className="text-xs text-gray-600 text-center">Analytics</span>
          </Link>
          <Link to="/business/categories" className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <FolderTree className="text-orange-600" size={20} />
            </div>
            <span className="text-xs text-gray-600 text-center">Categories</span>
          </Link>
          <Link to="/business/reports" className="flex flex-col items-center gap-2 bg-white rounded-xl p-4">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <FileText className="text-pink-600" size={20} />
            </div>
            <span className="text-xs text-gray-600 text-center">Reports</span>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl mb-4">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <Link to="/business/orders" className="text-sm text-primary-600">View all</Link>
          </div>
          {orders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{order.items?.length} items • {formatDate(order.createdAt)}</p>
                  </div>
                  <span className="font-semibold text-primary-600">{formatCurrency(order.total)} Ks</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Products */}
        <div className="bg-white rounded-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Products</h3>
            <Link to="/business/products" className="text-sm text-primary-600">View all</Link>
          </div>
          {products.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-gray-500">No products yet</p>
              <Link to="/business/products/new" className="text-sm text-primary-600 mt-2 inline-block">
                Add your first product
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((product) => (
                <div key={product.id} className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.title}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(product.price)} Ks • Stock: {product.stock}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {product.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
