import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Grid, List } from 'lucide-react';
import { collection, query, where, getDocs, QueryConstraint, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { BottomNav } from '../../components/navigation/BottomNav';
import BannerAd from '../../components/ads/BannerAd';
import { trackEvent } from '../../services/analytics';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified') === 'true');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [searchParams]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.q = searchQuery;
    if (selectedCategory) params.category = selectedCategory;
    if (sortBy !== 'newest') params.sort = sortBy;
    if (condition) params.condition = condition;
    if (verifiedOnly) params.verified = 'true';
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, sortBy, condition, verifiedOnly]);

  const fetchCategories = async () => {
    try {
      const q = query(collection(db, 'categories'), firestoreOrderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const constraints: QueryConstraint[] = [];
      constraints.push(where('status', '==', 'active'));

      if (selectedCategory) {
        constraints.push(where('categoryId', '==', selectedCategory));
      }

      if (condition) {
        constraints.push(where('condition', '==', condition));
      }

      switch (sortBy) {
        case 'price_low':
          constraints.push(firestoreOrderBy('price', 'asc'));
          break;
        case 'price_high':
          constraints.push(firestoreOrderBy('price', 'desc'));
          break;
        case 'popular':
          constraints.push(firestoreOrderBy('views', 'desc'));
          break;
        default:
          constraints.push(firestoreOrderBy('createdAt', 'desc'));
      }

      const q = query(collection(db, 'products'), ...constraints);
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));

      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        data = data.filter(
          (p) =>
            p.title.toLowerCase().includes(queryLower) ||
            p.description?.toLowerCase().includes(queryLower)
        );
        trackEvent('search', { search_term: searchQuery, results_count: data.length });
      }

      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('newest');
    setCondition('');
    setVerifiedOnly(false);
  };

  const hasActiveFilters = selectedCategory || sortBy !== 'newest' || condition || verifiedOnly;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-20 py-2.5 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 rounded-full hover:bg-gray-200"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-full ${showFilters ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-200'}`}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </form>
        </div>
      </header>

      <main className="px-4 py-4">
        <BannerAd className="mb-4" />

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-primary-600">
                  Clear all
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm ${
                      selectedCategory === cat.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition Filter */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Condition</label>
              <div className="flex gap-2">
                {['new', 'used', 'refurbished'].map((cond) => (
                  <button
                    key={cond}
                    onClick={() => setCondition(condition === cond ? '' : cond)}
                    className={`px-3 py-1.5 rounded-full text-sm capitalize ${
                      condition === cond
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Verified Only */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Verified shops only</span>
            </label>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Searching...' : `${products.length} products found`}
          </p>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className={`${viewMode === 'grid' ? 'aspect-square' : 'h-32'} bg-gray-200`} />
                <div className="p-3">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Search className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

const ProductCard: React.FC<ProductCardProps> = ({ product, viewMode }) => {
  if (viewMode === 'list') {
    return (
      <Link to={`/product/${product.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm flex">
        <div className="w-28 h-28 bg-gray-100 flex-shrink-0">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
          )}
        </div>
        <div className="p-3 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h3>
          <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
          {product.condition === 'used' && (
            <span className="ml-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Used</span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/product/${product.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="aspect-square bg-gray-100 relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
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
  );
};
