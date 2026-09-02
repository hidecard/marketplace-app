import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, ShoppingBag, MessageCircle, Star, CheckCircle } from 'lucide-react';
import { collection, query, where, orderBy, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Notification } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = () => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setLoading(false);
    });

    return unsubscribe;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
      case 'order_status':
        return <ShoppingBag className="text-blue-600" size={20} />;
      case 'new_message':
        return <MessageCircle className="text-green-600" size={20} />;
      case 'new_review':
        return <Star className="text-yellow-600" size={20} />;
      case 'verification_result':
        return <CheckCircle className="text-purple-600" size={20} />;
      default:
        return <Bell className="text-gray-600" size={20} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center">
            <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-sm text-primary-600 font-medium">
              Mark all read
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h2>
            <p className="text-gray-500">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => markAsRead(notification.id)}
                className={`bg-white rounded-xl p-4 flex items-start gap-3 cursor-pointer ${
                  !notification.read ? 'border-l-4 border-primary-600' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{notification.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDateTime(notification.createdAt)}</p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
