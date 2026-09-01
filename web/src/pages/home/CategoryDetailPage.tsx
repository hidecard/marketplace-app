import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { BottomNav } from '../../components/navigation/BottomNav';

export const CategoryDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    if (slug) {
      fetchCategory();
    }
  }, [slug]);

  useEffect(() => {
    if (category) {
      fetchProducts();
    }
  }, [category, sortBy]);

  const fetchCategory = async () => {
    try {
      const q = query(collection(db, 'categories'), where('slug', '==', slug));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Category;
        setCategory(data);
      }
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchProducts = async () => {
    if (!category) return;
    setLoading(true);
    try {
      let q = query(
        collection(db, 'products'),
        where('categoryId', '==', category.id),
        where('status', '==', 'active')
      );

      switch (sortBy) {
        case 'price_low':
          q = query(collection(db, 'products'), where('categoryId', '==', category.id), where('status', '==', 'active'), orderBy('price', 'asc'));
          break;
        case 'price_high':
          q = query(collection(db, 'products'), where('categoryId', '==', category.id), where('status', '==', 'active'), orderBy('price', 'desc'));
          break;
        case 'popular':
          q = query(collection(db, 'products'), where('categoryId', '==', category.id), where('status', '==', 'active'), orderBy('views', 'desc'));
          break;
        default:
          q = query(collection(db, 'products'), where('categoryId', '==', category.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center">
            <Link to="/categories" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">{category?.name || 'Category'}</h1>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-gray-100 border-0 rounded-full text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="popular">Most Popular</option>
          </select>
          <span className="text-sm text-gray-500">{products.length} products</span>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products</h3>
            <p className="text-gray-500">No products in this category yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <div className="aspect-square bg-gray-100 relative">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingCart size={32} />
                    </div>
                  )}
                  {product.condition === 'used' && (
                    <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Used
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h3>
                  <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};
