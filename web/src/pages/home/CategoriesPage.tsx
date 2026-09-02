import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Category, Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import BannerAd from '../../components/ads/BannerAd';

export const CategoriesPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (slug) {
      const category = categories.find((c) => c.slug === slug);
      if (category) {
        setSelectedCategory(category);
        fetchProducts(category.id);
      }
    }
  }, [slug, categories]);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
      if (!slug && data.length > 0) {
        setSelectedCategory(data[0]);
        fetchProducts(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (categoryId: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'products'),
        where('categoryId', '==', categoryId),
        where('status', '==', 'active'),
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

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="flex items-center px-4 h-14">
            <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} />
            </Link>
            <h1 className="ml-2 text-lg font-semibold">Categories</h1>
          </div>
        </header>
        <div className="flex">
          <div className="w-24 bg-gray-50 p-2 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="flex-1 p-4">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="px-4 py-3">
          <BannerAd className="mb-3" />
        </div>
        <div className="flex items-center px-4 h-14">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Categories</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search in category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Category Sidebar */}
        <div className="w-24 bg-gray-50 overflow-y-auto h-[calc(100vh-140px)] sticky top-[140px]">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category);
                fetchProducts(category.id);
              }}
              className={`w-full p-3 text-center border-l-2 transition-colors ${
                selectedCategory?.id === category.id
                  ? 'border-primary-600 bg-white text-primary-600'
                  : 'border-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 mx-auto mb-1 overflow-hidden">
                {category.icon ? (
                  <img src={category.icon} alt={category.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                    {category.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-xs line-clamp-2">{category.name}</span>
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4">
          {selectedCategory && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{selectedCategory.name}</h2>
              <p className="text-sm text-gray-500">{filteredProducts.length} products</p>
            </div>
          )}

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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="aspect-square bg-gray-100">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
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
      </div>
    </div>
  );
};
