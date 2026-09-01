import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Smartphone, CreditCard, Printer } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Shop } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

interface CartItem {
  product: Product;
  quantity: number;
}

export const POSPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchShop();
    }
  }, [user]);

  useEffect(() => {
    if (shop) {
      fetchProducts();
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
        trackEvent('pos_opened', { shop_id: shopData.id, shop_name: shopData.name });
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
    }
  };

  const fetchProducts = async () => {
    if (!shop) return;
    try {
      const q = query(
        collection(db, 'products'),
        where('shopId', '==', shop.id),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('Not enough stock');
        return;
      }
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (product.stock === 0) {
        toast.error('Out of stock');
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta;
            if (newQuantity <= 0) return null;
            if (newQuantity > item.product.stock) {
              toast.error('Not enough stock');
              return item;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal - discount;

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      let totalGrossProfit = 0;
      let totalCostOfGoodsSold = 0;

      await runTransaction(db, async (transaction) => {
        const movementPromises: Promise<void>[] = [];

        for (const item of cart) {
          const productRef = doc(db, 'products', item.product.id);
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw new Error(`Product ${item.product.title} not found`);
          }
          const currentStock = productDoc.data().stock;
          if (currentStock < item.quantity) {
            throw new Error(`Not enough stock for ${item.product.title}`);
          }
          const newStock = currentStock - item.quantity;
          transaction.update(productRef, {
            stock: newStock,
            updatedAt: serverTimestamp(),
          });

          const itemProfit = (item.product.price - (item.product.costPrice || 0)) * item.quantity;
          const itemCogs = (item.product.costPrice || 0) * item.quantity;
          totalGrossProfit += itemProfit;
          totalCostOfGoodsSold += itemCogs;

          const movementRef = doc(collection(db, 'inventory_movements'));
          transaction.set(movementRef, {
            productId: item.product.id,
            shopId: shop!.id,
            type: 'decrement',
            quantity: item.quantity,
            previousStock: currentStock,
            newStock,
            userId: user!.uid,
            createdAt: serverTimestamp(),
          });
        }

        const saleRef = doc(collection(db, 'pos_sales'));
        transaction.set(saleRef, {
          shopId: shop!.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            title: item.product.title,
            price: item.product.price,
            costPrice: item.product.costPrice || 0,
            quantity: item.quantity,
            subtotal: item.product.price * item.quantity,
            grossProfit: (item.product.price - (item.product.costPrice || 0)) * item.quantity,
          })),
          subtotal,
          discount,
          total,
          grossProfit: totalGrossProfit,
          costOfGoodsSold: totalCostOfGoodsSold,
          paymentMethod,
          customerName: '',
          customerPhone: '',
          note: '',
          createdAt: serverTimestamp(),
        });

        const shopRef = doc(db, 'shops', shop!.id);
        transaction.update(shopRef, {
          totalSales: (shop!.totalSales || 0) + total,
          updatedAt: serverTimestamp(),
        });
      });

      trackEvent('pos_sale_completed', { sale_total: total, gross_profit: totalGrossProfit, items_count: cart.length });
      toast.success('Sale completed!');
      setCart([]);
      setDiscount(0);
      setShowPayment(false);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    // For Android Bluetooth printing, you would integrate with a native bridge
    // For now, we'll create a printable receipt
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: monospace; width: 80mm; margin: 0 auto; padding: 10px; }
              .center { text-align: center; }
              .line { border-top: 1px dashed #000; margin: 10px 0; }
              .row { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="center">
              <h2>${shop?.name || 'Shop'}</h2>
              <p>${shop?.address || ''}</p>
              <p>Tel: ${shop?.phone || ''}</p>
            </div>
            <div class="line"></div>
            <p>Date: ${new Date().toLocaleString()}</p>
            <div class="line"></div>
            ${cart.map((item) => `
              <div class="row">
                <span>${item.product.title}</span>
              </div>
              <div class="row">
                <span>${item.quantity} x ${item.product.price}</span>
                <span>${item.quantity * item.product.price}</span>
              </div>
            `).join('')}
            <div class="line"></div>
            <div class="row">
              <span>Subtotal:</span>
              <span>${subtotal} Ks</span>
            </div>
            ${discount > 0 ? `
              <div class="row">
                <span>Discount:</span>
                <span>-${discount} Ks</span>
              </div>
            ` : ''}
            <div class="row bold">
              <span>TOTAL:</span>
              <span>${total} Ks</span>
            </div>
            <div class="line"></div>
            <p>Payment: ${paymentMethod.toUpperCase()}</p>
            <div class="line"></div>
            <div class="center">
              <p>Thank you for your purchase!</p>
            </div>
          </body>
        </html>
      `);
      receiptWindow.document.close();
      receiptWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Products Section */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-semibold">Point of Sale</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white rounded-xl p-3 text-left hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingCart size={24} />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.title}</h3>
                  <p className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</p>
                  <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Current Sale</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-500">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                  <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingCart size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product.title}</p>
                    <p className="text-sm text-primary-600">{formatCurrency(item.product.price)} Ks</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-7 h-7 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)} Ks</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-600">Discount</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
              placeholder="0"
            />
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
            <span>Total</span>
            <span className="text-primary-600">{formatCurrency(total)} Ks</span>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            Charge {formatCurrency(total)} Ks
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'kbzpay', label: 'KBZPay', icon: Smartphone },
                { id: 'wavepay', label: 'Wave Pay', icon: Smartphone },
                { id: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard },
              ].map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${
                      paymentMethod === method.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <Icon size={24} className={paymentMethod === method.id ? 'text-primary-600' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${paymentMethod === method.id ? 'text-primary-600' : 'text-gray-600'}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSale}
                disabled={loading}
                className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
            <button
              onClick={handlePrintReceipt}
              className="w-full mt-3 py-2 text-primary-600 font-medium flex items-center justify-center gap-2"
            >
              <Printer size={18} />
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
