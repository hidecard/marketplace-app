import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, MapPin } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Address } from '../../types';
import { formatCurrency, generateOrderNumber } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    label: 'Home',
    name: '',
    phone: '',
    address: '',
    city: '',
    region: '',
  });

  useEffect(() => {
    fetchAddresses();
  }, [items]);

  const fetchAddresses = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'addresses'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Address));
      setAddresses(data);
      const defaultAddress = data.find((a) => a.isDefault) || data[0];
      if (defaultAddress) setSelectedAddress(defaultAddress);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleAddAddress = async () => {
    if (!user || !newAddress.name || !newAddress.phone || !newAddress.address) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const addressData = {
        ...newAddress,
        userId: user.uid,
        isDefault: addresses.length === 0,
      };
      const docRef = await addDoc(collection(db, 'addresses'), addressData);
      const address = { id: docRef.id, ...addressData } as Address;
      setAddresses([...addresses, address]);
      setSelectedAddress(address);
      setShowAddressModal(false);
      toast.success('Address added');
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    trackEvent('checkout_started', { item_count: items.length, total: getTotal() });

    setLoading(true);
    try {
      const orderNumber = generateOrderNumber();
      const order = {
        orderNumber,
        buyerId: user.uid,
        shopId: items[0].shopId,
        items: items.map((item) => ({
          productId: item.productId,
          title: item.title,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        subtotal: getTotal(),
        deliveryFee: 0,
        discount: 0,
        total: getTotal(),
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        status: 'pending',
        shippingAddress: selectedAddress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Use transaction to update stock
      await runTransaction(db, async (transaction) => {
        for (const item of items) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw new Error(`Product ${item.title} not found`);
          }
          const currentStock = productDoc.data().stock;
          if (currentStock < item.quantity) {
            throw new Error(`Not enough stock for ${item.title}`);
          }
          transaction.update(productRef, {
            stock: currentStock - item.quantity,
            updatedAt: serverTimestamp(),
          });
        }
      });

      // Create order
      await addDoc(collection(db, 'orders'), order);
      trackEvent('order_placed', { order_number: orderNumber, total: getTotal() });

      // Clear cart
      clearCart();

      toast.success('Order placed successfully!');
      navigate('/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="flex items-center px-4 h-14">
            <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">Cart</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20">
          <ShoppingBag className="text-gray-300 mb-4" size={64} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 mb-6">Add some products to get started</p>
          <Link to="/" className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Cart ({items.length})</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Cart Items */}
        {items.map((item) => (
          <div key={item.productId} className="bg-white rounded-xl p-4 flex gap-4">
            <Link to={`/product/${item.productId}`} className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/product/${item.productId}`}>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h3>
              </Link>
              <p className="text-base font-bold text-primary-600 mt-1">{formatCurrency(item.price)} Ks</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    className="p-2 hover:bg-gray-200 rounded-l-lg"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-2 hover:bg-gray-200 rounded-r-lg"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Delivery Address */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MapPin size={18} />
              Delivery Address
            </h3>
            <button
              onClick={() => setShowAddressModal(true)}
              className="text-sm text-primary-600 font-medium"
            >
              {selectedAddress ? 'Change' : 'Add'}
            </button>
          </div>
          {selectedAddress ? (
            <div className="text-sm">
              <p className="font-medium text-gray-900">{selectedAddress.name}</p>
              <p className="text-gray-600">{selectedAddress.phone}</p>
              <p className="text-gray-500">{selectedAddress.address}, {selectedAddress.city}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No address selected</p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(getTotal())} Ks</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span className="text-primary-600">{formatCurrency(getTotal())} Ks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleCheckout}
          disabled={loading || !selectedAddress}
          className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : `Place Order - ${formatCurrency(getTotal())} Ks`}
        </button>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Address</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Label</label>
                <select
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Home">Home</option>
                  <option value="Office">Office</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
                <input
                  type="text"
                  value={newAddress.name}
                  onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="09xxxxxxxxx"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                <textarea
                  value={newAddress.address}
                  onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="Street address, building, floor..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
                  <input
                    type="text"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Region</label>
                  <input
                    type="text"
                    value={newAddress.region}
                    onChange={(e) => setNewAddress({ ...newAddress, region: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Region"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddressModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAddress}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-semibold"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
