import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, TrendingUp, DollarSign, ShoppingBag, Calendar, Menu } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, POSSale, Expense, Shop } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import toast from 'react-hot-toast';

export const BusinessReportsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [posSales, setPOSSales] = useState<POSSale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (user) fetchShop();
  }, [user]);

  useEffect(() => {
    if (shop) fetchReportData();
  }, [shop, dateRange]);

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

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return new Date(now.setHours(0, 0, 0, 0));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return new Date(0);
    }
  };

  const fetchReportData = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const startDate = getDateFilter();

      const ordersQuery = query(
        collection(db, 'orders'),
        where('shopId', '==', shop.id),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      setOrders(ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order)));

      const posQuery = query(
        collection(db, 'pos_sales'),
        where('shopId', '==', shop.id),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
      const posSnapshot = await getDocs(posQuery);
      setPOSSales(posSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as POSSale)));

      const expensesQuery = query(
        collection(db, 'expenses'),
        where('shopId', '==', shop.id),
        where('date', '>=', Timestamp.fromDate(startDate)),
        orderBy('date', 'desc')
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      setExpenses(expensesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense)));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = [...orders, ...posSales].reduce((sum, item) => sum + (item.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const totalOrders = orders.length + posSales.length;

  const handleExport = () => {
    const reportData = {
      shopName: shop?.name,
      dateRange,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOrders,
      },
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        date: o.createdAt,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
      })),
      posSales: posSales.map((s) => ({
        date: s.createdAt,
        total: s.total,
        paymentMethod: s.paymentMethod,
        items: s.items,
      })),
      expenses: expenses.map((e) => ({
        date: e.date,
        category: e.category,
        amount: e.amount,
        description: e.description,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${shop?.name || 'shop'}-${dateRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  };

  if (!shop && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        </header>
        <div className="p-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">Create a shop to view reports</p>
            <Link to="/business/create-shop" className="text-primary-600 font-medium mt-2 inline-block">
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
            <div className="flex items-center">
              <Link to="/business" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                <ArrowLeft size={22} />
              </Link>
              <h1 className="ml-2 text-lg font-semibold">Reports</h1>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <div className="p-4">
        {/* Date Range Selector */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-gray-500" />
            <span className="font-medium text-gray-900">Date Range</span>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((range) => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  dateRange === range.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-red-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
                    <p className="text-xs text-gray-500">Expenses</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(netProfit)}</p>
                    <p className="text-xs text-gray-500">Net Profit</p>
                  </div>
                </div>
              </div>
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
                  <p className="text-gray-500">No orders in this period</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary-600">{formatCurrency(order.total)} Ks</p>
                        <p className="text-xs text-gray-500">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Expenses */}
            <div className="bg-white rounded-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
                <Link to="/business/expenses" className="text-sm text-primary-600">View all</Link>
              </div>
              {expenses.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No expenses in this period</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {expenses.slice(0, 10).map((expense) => (
                    <div key={expense.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{expense.category}</p>
                        <p className="text-sm text-gray-500">{expense.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(expense.date)}</p>
                      </div>
                      <p className="font-semibold text-red-600">-{formatCurrency(expense.amount)} Ks</p>
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
