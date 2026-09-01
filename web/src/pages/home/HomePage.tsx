import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Bell, ChevronRight, Star, Shield, User } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Category, Shop } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { BottomNav } from '../../components/navigation/BottomNav';
import BannerAd from '../../components/ads/BannerAd';

const bannerImages = [
  'https://via.placeholder.com/800x200/3B82F6/FFFFFF?text=Welcome+to+Marketplace',
  'https://via.placeholder.com/800x200/22C55E/FFFFFF?text=Free+POS+for+Sellers',
  'https://via.placeholder.com/800x200/F59E0B/FFFFFF?text=Verified+Shops+Only',
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items: cartItems } = useCartStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [verifiedShops, setVerifiedShops] = useState<Shop[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchFeaturedProducts();
    fetchRecentProducts();
    fetchVerifiedShops();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        orderBy('views', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setFeaturedProducts(data);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    }
  };

  const fetchRecentProducts = async () => {
    try {
      const q = query(
        collection(db, 'products'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setRecentProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching recent products:', error);
      setLoading(false);
    }
  };

  const fetchVerifiedShops = async () => {
    try {
      const q = query(
        collection(db, 'shops'),
        where('verified', '==', true),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Shop));
      setVerifiedShops(data);
    } catch (error) {
      console.error('Error fetching verified shops:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <ShoppingCart className="text-white" size={20} />
              </div>
              <span className="text-lg font-bold text-gray-900">Marketplace</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell size={22} className="text-gray-700" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Link>
              <Link to="/cart" className="p-2 rounded-full hover:bg-gray-100 relative">
                <ShoppingCart size={22} className="text-gray-700" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="p-2 rounded-full hover:bg-gray-100">
                <User size={22} className="text-gray-700" />
              </Link>
            </div>
          </div>
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products, shops, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
          </form>
        </div>
      </header>

      <main className="px-4 py-4">
        <BannerAd className="mb-6" />

        {/* Banner Carousel */}
        <div className="relative rounded-xl overflow-hidden mb-6">
          <div className="aspect-[4/1] bg-gradient-to-r from-primary-600 to-primary-400 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h2 className="text-xl font-bold mb-1">
                {currentBanner === 0 && 'Welcome to Marketplace'}
                {currentBanner === 1 && 'Free POS for Sellers'}
                {currentBanner === 2 && 'Shop with Confidence'}
              </h2>
              <p className="text-sm opacity-90">
                {currentBanner === 0 && 'Buy and sell with trusted verified shops'}
                {currentBanner === 1 && 'Manage your business with our free tools'}
                {currentBanner === 2 && 'All verified shops are trusted and reliable'}
              </p>
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {bannerImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentBanner ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Categories */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <Link to="/categories" className="text-primary-600 text-sm font-medium flex items-center gap-1">
              See all <ChevronRight size={16} />
            </Link>
          </div>
          {categories.length === 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center overflow-hidden">
                    {category.icon ? (
                      <img src={category.icon} alt={category.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-primary-600 font-bold text-lg">{category.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 text-center line-clamp-1">{category.name}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Verified Shops */}
        {verifiedShops.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Verified Shops</h2>
              <Link to="/shops" className="text-primary-600 text-sm font-medium flex items-center gap-1">
                See all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {verifiedShops.map((shop) => (
                <Link
                  key={shop.id}
                  to={`/shop/${shop.id}`}
                  className="flex-shrink-0 w-32 bg-white rounded-xl p-3 shadow-sm border border-gray-100"
                >
                  <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-2 overflow-hidden">
                    {shop.logo ? (
                      <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                        {shop.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs font-medium text-gray-900 truncate">{shop.name}</span>
                      {shop.verified && <Shield className="w-3 h-3 text-primary-600 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-gray-500">{shop.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Popular Products</h2>
              <Link to="/search?sort=popular" className="text-primary-600 text-sm font-medium flex items-center gap-1">
                See all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Recent Products */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">New Arrivals</h2>
            <Link to="/search?sort=newest" className="text-primary-600 text-sm font-medium flex items-center gap-1">
              See all <ChevronRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="aspect-square bg-gray-200 animate-pulse" />
                  <div className="p-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-5 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="text-gray-400" size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Yet</h3>
              <p className="text-gray-500 mb-4">Be the first to list a product!</p>
              {user && (
                <Link
                  to="/business/products/new"
                  className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add Product
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
</section>
        </main>
      <BottomNav />
    </div>
  );
};

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
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
        {product.comparePrice && product.comparePrice > product.price && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span className="text-xs text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
