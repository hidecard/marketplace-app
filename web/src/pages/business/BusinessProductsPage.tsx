import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Package, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Shop } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

export const BusinessProductsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
        setShop({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop);
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
    }
  };

  const fetchProducts = async () => {
    if (!shop) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'products'),
        where('shopId', '==', shop.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
    setActiveMenu(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center">
            <Link to="/business" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">My Products</h1>
          </div>
          <Link
            to="/business/products/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus size={18} />
            Add
          </Link>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex gap-4 animate-pulse">
                <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h2>
            <p className="text-gray-500 mb-6">Add your first product to start selling</p>
            <Link
              to="/business/products/new"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Plus size={20} />
              Add Product
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl p-4 flex gap-4">
                <Link to={`/product/${product.id}`} className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package size={24} />
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-medium text-gray-900 line-clamp-2">{product.title}</h3>
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
                    {product.comparePrice && (
                      <span className="text-sm text-gray-400 line-through">{formatCurrency(product.comparePrice)} Ks</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {product.status}
                    </span>
                    <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                    <span className="text-xs text-gray-500">{product.views} views</span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === product.id ? null : product.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>
                  {activeMenu === product.id && (
                    <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-32 z-10">
                      <button
                        onClick={() => {
                          // Navigate to edit page
                          setActiveMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
