import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, Package, ShoppingBag, FileCheck, AlertTriangle, Eye } from 'lucide-react';
import { AdminLayout } from '../components/layout/AdminLayout';
import { useCollectionCount } from '../hooks/useCollection';
import { where, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { count: totalUsers } = useCollectionCount('users');
  const { count: totalShops } = useCollectionCount('shops');
  const { count: totalProducts } = useCollectionCount('products');
  const { count: totalOrders } = useCollectionCount('orders');
  const { count: pendingVerifications } = useCollectionCount('verification_requests', [
    where('status', '==', 'pending'),
  ]);
  const { count: pendingReports } = useCollectionCount('reports', [where('status', '==', 'pending')]);

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchChartData();
    fetchRecentActivity();
  }, []);

  const fetchChartData = async () => {
    try {
      const days = 7;
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const ordersQuery = query(
          collection(db, 'orders'),
          where('createdAt', '>=', date),
          where('createdAt', '<', nextDate)
        );
        const snapshot = await getDocs(ordersQuery);
        data.push({
          name: date.toLocaleDateString('en', { weekday: 'short' }),
          orders: snapshot.size,
          revenue: snapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0),
        });
      }
      setChartData(data);
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(ordersQuery);
      const activities = snapshot.docs.slice(0, 5).map((doc) => ({
        id: doc.id,
        type: 'order',
        message: `New order #${doc.data().orderNumber}`,
        time: doc.data().createdAt?.toDate?.() || new Date(),
        status: doc.data().status,
      }));
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'bg-blue-500', change: '+12%' },
    { label: 'Total Shops', value: totalShops, icon: Store, color: 'bg-green-500', change: '+8%' },
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'bg-purple-500', change: '+25%' },
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'bg-orange-500', change: '+18%' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change} from last week</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#22C55E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/admin/verifications"
              className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100"
            >
              <div className="flex items-center gap-3">
                <FileCheck className="text-yellow-600" size={20} />
                <span className="font-medium text-yellow-800">Pending Verifications</span>
              </div>
              <span className="bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingVerifications}
              </span>
            </Link>
            <Link
              to="/admin/reports"
              className="flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-600" size={20} />
                <span className="font-medium text-red-800">Pending Reports</span>
              </div>
              <span className="bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingReports}
              </span>
            </Link>
            <Link
              to="/admin/banners"
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <div className="flex items-center gap-3">
                <Eye className="text-blue-600" size={20} />
                <span className="font-medium text-blue-800">Manage Banners</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time.toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                    activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
