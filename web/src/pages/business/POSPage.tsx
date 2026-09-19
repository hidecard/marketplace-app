import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Smartphone, CreditCard, Printer, Scan, Menu, FileDown, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, serverTimestamp, addDoc, doc, runTransaction } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FunctionsService } from '../../services/functions';
import { Product, Shop } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';

interface CartItem {
  product: Product;
  quantity: number;
}

interface SaleSnapshot {
  id: string;
  shopId: string;
  shopName: string;
  items: { title: string; price: number; quantity: number; subtotal: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  createdAtMs: number;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildReceiptHtml(sale: SaleSnapshot, shop: Shop | null): string {
  const date = new Date(sale.createdAtMs).toLocaleString();
  const itemsHtml = sale.items
    .map(
      (i) => `
      <div class="row">
        <span>${escapeHtml(i.title)}</span>
      </div>
      <div class="row">
        <span>${i.quantity} x ${formatCurrency(i.price)}</span>
        <span>${formatCurrency(i.subtotal)} Ks</span>
      </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt ${sale.id}</title>
<style>
  body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; width: 80mm; margin: 0 auto; padding: 12px; color: #000; }
  .center { text-align: center; }
  .line { border-top: 1px dashed #000; margin: 10px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .bold { font-weight: 700; }
  h2 { margin: 0; font-size: 18px; }
  p { margin: 2px 0; font-size: 13px; }
</style>
</head><body>
  <div class="center">
    <h2>${escapeHtml(shop?.name ?? sale.shopName)}</h2>
    <p>${escapeHtml(shop?.address ?? '')}</p>
    <p>Tel: ${escapeHtml(shop?.phone ?? '')}</p>
  </div>
  <div class="line"></div>
  <p>Date: ${escapeHtml(date)}</p>
  <p>Receipt: ${escapeHtml(sale.id)}</p>
  <div class="line"></div>
  ${itemsHtml}
  <div class="line"></div>
  <div class="row"><span>Subtotal:</span><span>${formatCurrency(sale.subtotal)} Ks</span></div>
  ${sale.discount > 0 ? `<div class="row"><span>Discount:</span><span>-${formatCurrency(sale.discount)} Ks</span></div>` : ''}
  ${sale.tax > 0 ? `<div class="row"><span>Tax:</span><span>${formatCurrency(sale.tax)} Ks</span></div>` : ''}
  <div class="row bold"><span>TOTAL:</span><span>${formatCurrency(sale.total)} Ks</span></div>
  <div class="line"></div>
  <p>Payment: ${escapeHtml(sale.paymentMethod.toUpperCase())}</p>
  <div class="line"></div>
  <div class="center"><p>Thank you for your purchase!</p></div>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const [tax, setTax] = useState(0);
  const [lastSale, setLastSale] = useState<SaleSnapshot | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

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
      let data: Product[] = [];
      try {
        const q = query(
          collection(db, 'products'),
          where('shopId', '==', shop.id),
          where('status', '==', 'active'),
        );
        const snapshot = await getDocs(q);
        data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      } catch (idxErr) {
        const qFallback = query(
          collection(db, 'products'),
          where('shopId', '==', shop.id),
        );
        const snapshot = await getDocs(qFallback);
        data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Product))
          .filter((p) => !p.status || p.status === 'active');
      }
      setProducts(data);
    } catch (error) {
      console.warn('Error fetching products:', error);
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [products, searchQuery],
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
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
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
        .filter(Boolean) as CartItem[],
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart],
  );
  const total = useMemo(() => Math.max(0, subtotal - discount + tax), [subtotal, discount, tax]);

  const buildSaleSnapshot = (): SaleSnapshot | null => {
    if (!shop || !user) return null;
    return {
      id: generateIdempotencyKey(),
      shopId: shop.id,
      shopName: shop.name,
      items: cart.map((i) => ({
        title: i.product.title,
        price: i.product.price,
        quantity: i.quantity,
        subtotal: i.product.price * i.quantity,
      })),
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      createdAtMs: Date.now(),
    };
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0 || !shop || !user) return;
    setLoading(true);
    setPrintError(null);
    const pending = buildSaleSnapshot();
    if (!pending) {
      setLoading(false);
      return;
    }

    try {
      let createdAtMs = Date.now();
      try {
        const result = await FunctionsService.callOrThrow<any>('createPOSSale', {
          shopId: shop.id,
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          discount,
          tax,
          paymentMethod,
          idempotencyKey: pending.id,
        });
        if (result?.createdAtMs) createdAtMs = result.createdAtMs;
      } catch (fnErr: any) {
        console.warn('Cloud Function unavailable, running direct Firestore atomic transaction:', fnErr);
        // Direct Firestore atomic transaction fallback
        await runTransaction(db, async (tx) => {
          for (const item of cart) {
            const productRef = doc(db, 'products', item.product.id);
            const productDoc = await tx.get(productRef);
            if (productDoc.exists()) {
              const currentStock = productDoc.data().stock ?? 0;
              tx.update(productRef, {
                stock: Math.max(0, currentStock - item.quantity),
                salesCount: (productDoc.data().salesCount ?? 0) + item.quantity,
                updatedAt: serverTimestamp(),
              });
            }
          }
          const saleDocRef = doc(db, 'pos_sales', pending.id);
          tx.set(saleDocRef, {
            id: pending.id,
            shopId: shop.id,
            cashierId: user.uid,
            items: pending.items.map(item => ({
              ...item,
              productId: cart.find(c => c.product.title === item.title)?.product.id || '',
            })),
            subtotal,
            discount,
            tax,
            total,
            paymentMethod,
            createdAt: serverTimestamp(),
          });
        });
      }

      const confirmed: SaleSnapshot = {
        id: pending.id,
        shopId: shop.id,
        shopName: shop.name,
        items: pending.items,
        subtotal,
        discount,
        tax,
        total,
        paymentMethod,
        createdAtMs,
      };

      setLastSale(confirmed);
      trackEvent('pos_sale_completed', { sale_total: total, items_count: cart.length });
      toast.success('Sale completed!');
      setCart([]);
      setDiscount(0);
      setTax(0);
      setShowPayment(false);
      fetchProducts();
    } catch (error: any) {
      console.error('POS sale error:', error);
      toast.error(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (saleOverride?: SaleSnapshot) => {
    const sale = saleOverride ?? lastSale;
    if (!sale) {
      toast.error('No receipt to print yet');
      return;
    }
    const html = buildReceiptHtml(sale, shop);
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      queueFailedPrint(sale, 'Popup blocked');
      setPrintError('Popup blocked. Receipt saved to print queue.');
      return;
    }
    receiptWindow.document.open();
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.focus();
    try {
      receiptWindow.print();
    } catch (err) {
      console.error('Print failed:', err);
      queueFailedPrint(sale, (err as Error)?.message ?? 'Unknown error');
      setPrintError('Printing failed. Receipt saved to print queue.');
    }
  };

  const queueFailedPrint = async (sale: SaleSnapshot, reason: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'printJobs'), {
        type: 'pos_receipt',
        saleId: sale.id,
        shopId: sale.shopId,
        ownerId: user.uid,
        payload: sale,
        reason,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to queue print job:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => useUIStore.getState().toggleSidebar()}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <Menu size={22} />
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
                  <ArrowLeft size={22} />
                </button>
                <h1 className="text-lg font-semibold">Point of Sale</h1>
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => toast('Barcode scanner will open here')}
                className="p-1.5 rounded-full hover:bg-gray-200"
                title="Scan barcode"
              >
                <Scan size={18} />
              </button>
            </div>
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

      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Current Sale</h2>
        </div>

        {lastSale && (
          <div className="p-4 bg-green-50 border-b border-green-100 space-y-2">
            <p className="text-xs text-green-700 font-medium">Last sale recorded</p>
            <p className="text-sm text-green-900">
              {formatCurrency(lastSale.total)} Ks &middot; {lastSale.paymentMethod.toUpperCase()}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePrintReceipt()}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-white border border-green-200 text-green-800 px-2 py-1 rounded-md hover:bg-green-100"
              >
                <Printer size={14} /> Print
              </button>
              <button
                onClick={() => downloadReceipt(lastSale, shop)}
                className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-white border border-green-200 text-green-800 px-2 py-1 rounded-md hover:bg-green-100"
              >
                <FileDown size={14} /> Save HTML
              </button>
            </div>
            {printError && (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <AlertCircle size={12} /> {printError}
              </p>
            )}
          </div>
        )}

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
              min={0}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
              placeholder="0"
            />
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-600">Tax</span>
            <input
              type="number"
              value={tax}
              min={0}
              onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
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
                      paymentMethod === method.id ? 'border-primary-600 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <Icon size={24} className={paymentMethod === method.id ? 'text-primary-600' : 'text-gray-400'} />
                    <span
                      className={`text-sm font-medium ${
                        paymentMethod === method.id ? 'text-primary-600' : 'text-gray-600'
                      }`}
                    >
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
          </div>
        </div>
      )}
    </div>
  );
};

function extractErrorMessage(error: any): string {
  if (!error) return 'Failed to complete sale';
  if (typeof error === 'string') return error;
  if (error.details) return String(error.details);
  if (error.code && error.message && error.message !== error.code) return `${error.code}: ${error.message}`;
  if (error.message && error.message.toLowerCase() !== 'internal') return error.message;
  if (error.code === 'functions/internal' || error.message?.toLowerCase() === 'internal') {
    return 'Sale service failed. Please check that Firebase Functions are deployed, then try again.';
  }
  return 'Failed to complete sale';
}

function downloadReceipt(sale: SaleSnapshot, shop: Shop | null): void {
  const html = buildReceiptHtml(sale, shop);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${sale.id}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
