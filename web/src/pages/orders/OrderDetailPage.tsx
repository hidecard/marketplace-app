import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Phone, Clock, CheckCircle, MessageCircle, Truck, AlertTriangle } from 'lucide-react';
import { doc, getDoc, collection, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Order, Shop } from '../../types';
import { formatCurrency, formatDateTime, getOrderStatusColor } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

const orderStatusSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
        setOrder(orderData);

        // Fetch shop info
        if (orderData.shopId) {
          const shopDoc = await getDoc(doc(db, 'shops', orderData.shopId));
          if (shopDoc.exists()) {
            setShop({ id: shopDoc.id, ...shopDoc.data() } as Shop);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;
    try {
      const updateData: any = {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      };

      if (order.paymentMethod === 'cod') {
        updateData.codRejectionCount = (order.codRejectionCount || 0) + 1;
        updateData.codRejectionHistory = [
          ...(order.codRejectionHistory || []),
          { date: new Date(), reason: 'Buyer cancelled' },
        ];
      }

      await updateDoc(doc(db, 'orders', order.id), updateData);
      trackEvent('order_cancelled', { order_id: order.id, order_number: order.orderNumber });
      toast.success('Order cancelled');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      trackEvent('order_completed', { order_id: order.id, order_number: order.orderNumber });
      toast.success('Order completed! Leave a review for the seller.');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to complete order');
    }
  };

  const handleContactSeller = async () => {
    if (!order || !user) return;
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, order.items[0]?.productId || ''],
        orderId: order.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/chats/${chatRef.id}`);
    } catch (error) {
      toast.error('Failed to start chat');
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    return orderStatusSteps.findIndex((step) => step.key === order.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="flex items-center px-4 h-14">
            <Link to="/orders" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">Order Details</h1>
          </div>
        </header>
        <div className="p-4 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-4" />
          <div className="h-20 bg-gray-200 rounded-xl mb-4" />
          <div className="h-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Order not found</p>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/orders" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Order #{order.orderNumber}</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.status)}`}>
              {order.status.replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</span>
          </div>

          {/* Progress Steps */}
          {!['cancelled', 'rejected'].includes(order.status) && (
            <div className="flex items-center justify-between">
              {orderStatusSteps.slice(0, 5).map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-xs text-gray-500 mt-1 text-center hidden sm:block">{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <MapPin size={18} />
            Delivery Address
          </h3>
          <div className="text-sm">
            <p className="font-medium text-gray-900">{order.shippingAddress?.name}</p>
            <p className="text-gray-600 flex items-center gap-1 mt-1">
              <Phone size={14} />
              {order.shippingAddress?.phone}
            </p>
            <p className="text-gray-500 mt-1">
              {order.shippingAddress?.address}, {order.shippingAddress?.city}
            </p>
          </div>
        </div>

        {/* Shop Info */}
        {shop && (
          <Link to={`/shop/${shop.id}`} className="bg-white rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden">
              {shop.logo ? (
                <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                  {shop.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{shop.name}</p>
              <p className="text-sm text-gray-500">{shop.city}</p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleContactSeller();
              }}
              className="p-2 bg-primary-50 text-primary-600 rounded-full"
            >
              <MessageCircle size={20} />
            </button>
          </Link>
        )}

        {/* Buyer Trust Indicator */}
        {order.paymentMethod === 'cod' && order.codRejectionCount && order.codRejectionCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
              <AlertTriangle size={18} />
              Buyer COD History
            </h3>
            <p className="text-sm text-yellow-700">
              This buyer has {order.codRejectionCount} COD rejection{order.codRejectionCount > 1 ? 's' : ''} on record.
            </p>
            {order.codRejectionHistory && order.codRejectionHistory.length > 0 && (
              <div className="mt-2 space-y-1">
                {order.codRejectionHistory.map((entry, idx) => (
                  <p key={idx} className="text-xs text-yellow-600">
                    {entry.date instanceof Date ? entry.date.toLocaleDateString() : new Date(entry.date).toLocaleDateString()}
                    {entry.reason && ` - ${entry.reason}`}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-3">
            {order.items?.map((item, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.subtotal)} Ks</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)} Ks</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className="text-green-600">{order.deliveryFee === 0 ? 'Free' : `${formatCurrency(order.deliveryFee)} Ks`}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span className="text-red-600">-{formatCurrency(order.discount)} Ks</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Payment Method</span>
              <span className="capitalize">{order.paymentMethod.replace('_', ' ')}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900 text-base">
              <span>Total</span>
              <span className="text-primary-600">{formatCurrency(order.total)} Ks</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {order.status === 'pending' && (
            <button
              onClick={handleCancelOrder}
              className="flex-1 py-3 border border-red-500 text-red-500 rounded-xl font-semibold"
            >
              Cancel Order
            </button>
          )}
          {order.status === 'delivered' && (
            <button
              onClick={handleCompleteOrder}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold"
            >
              Complete Order
            </button>
          )}
          {order.status === 'completed' && (
            <Link
              to={`/product/${order.items?.[0]?.productId}`}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold text-center"
            >
              Leave Review
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
