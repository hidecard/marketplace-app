import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, ShoppingBag } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, Shop } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';

interface CustomerSummary {
  buyerId: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
}

export const CustomersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) fetchShop();
  }, [user]);

  useEffect(() => {
    if (shop) fetchCustomers();
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

  const fetchCustomers = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('shopId', '==', shop.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));

      const customerMap = new Map<string, CustomerSummary>();
      orders.forEach((order) => {
        const existing = customerMap.get(order.buyerId);
        const orderTotal = order.total || 0;
        const orderDate = order.createdAt instanceof Date ? order.createdAt : order.createdAt?.toDate?.() || new Date();

        if (existing) {
          existing.totalOrders += 1;
          existing.totalSpent += orderTotal;
          if (orderDate > existing.lastOrderDate) {
            existing.lastOrderDate = orderDate;
          }
        } else {
          customerMap.set(order.buyerId, {
            buyerId: order.buyerId,
            name: order.shippingAddress?.name || 'Unknown',
            phone: order.shippingAddress?.phone || '',
            totalOrders: 1,
            totalSpent: orderTotal,
            lastOrderDate: orderDate,
          });
        }
      });

      const sortedCustomers = Array.from(customerMap.values()).sort(
        (a, b) => b.lastOrderDate.getTime() - a.lastOrderDate.getTime()
      );
      setCustomers(sortedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/business" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Customers</h1>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Customers</h2>
            <p className="text-gray-500">Customers will appear here after their first order</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.buyerId} className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-bold text-lg">
                      {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <ShoppingBag size={12} />
                        {customer.totalOrders} orders
                      </span>
                      <span>{formatCurrency(customer.totalSpent)} Ks spent</span>
                    </div>
                  </div>
                </div>
                {customer.lastOrderDate && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last order: {formatDate(customer.lastOrderDate)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
