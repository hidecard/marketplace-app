import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Shield, MapPin, MessageCircle, Heart, Share2, Grid, List, QrCode } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, getDocs, setDoc, deleteDoc, serverTimestamp, increment, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Shop, Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';
import QRModal from '../../components/offer/QRModal';

export const ShopPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchShop();
      fetchProducts();
      if (user) {
        checkFollowStatus();
        fetchFollowerCount();
      }
    }
  }, [shopId, user]);

  const fetchShop = async () => {
    if (!shopId) return;
    try {
      const shopDoc = await getDoc(doc(db, 'shops', shopId));
      if (shopDoc.exists()) {
        const shopData = { id: shopDoc.id, ...shopDoc.data() } as Shop;
        setShop(shopData);
        trackEvent('shop_view', { shop_id: shopData.id, shop_name: shopData.name });
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!shopId) return;
    try {
      const q = query(
        collection(db, 'products'),
        where('shopId', '==', shopId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !shopId) return;
    try {
      const q = query(
        collection(db, 'shop_followers'),
        where('userId', '==', user.uid),
        where('shopId', '==', shopId)
      );
      const snapshot = await getDocs(q);
      setIsFollowing(!snapshot.empty);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const fetchFollowerCount = async () => {
    if (!shopId) return;
    try {
      const q = query(collection(db, 'shop_followers'), where('shopId', '==', shopId));
      const snapshot = await getDocs(q);
      setFollowerCount(snapshot.size);
    } catch (error) {
      console.error('Error fetching follower count:', error);
    }
  };

  const handleFollow = async () => {
    if (!user || !shopId) {
      toast.error('Please login to follow shops');
      return;
    }
    try {
      if (isFollowing) {
        const q = query(
          collection(db, 'shop_followers'),
          where('userId', '==', user.uid),
          where('shopId', '==', shopId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          await deleteDoc(doc(db, 'shop_followers', snapshot.docs[0].id));
        }
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
        await updateDoc(doc(db, 'shops', shopId), {
          totalFollowers: increment(-1),
        });
      } else {
        await setDoc(doc(collection(db, 'shop_followers')), {
          userId: user.uid,
          shopId,
          createdAt: serverTimestamp(),
        });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
        await updateDoc(doc(db, 'shops', shopId), {
          totalFollowers: increment(1),
        });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handleChat = async () => {
    if (!user || !shop) return;
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, shop.ownerId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/chats/${chatRef.id}`);
    } catch (error) {
      toast.error('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-48 bg-gray-200 animate-pulse" />
        <div className="p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Shop not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQR(true)} className="p-2 rounded-full hover:bg-gray-100">
              <QrCode size={22} />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Share2 size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      <div className="h-40 bg-gradient-to-r from-primary-600 to-primary-400 relative">
        {shop.coverImage && (
          <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Shop Info */}
      <div className="bg-white px-4 py-6 -mt-10 relative rounded-t-3xl">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-lg overflow-hidden flex-shrink-0 border-4 border-white">
            {shop.logo ? (
              <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-2xl">
                {shop.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 truncate">{shop.name}</h1>
              {shop.verified && <Shield className="w-5 h-5 text-primary-600 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium text-gray-900">{shop.rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({shop.totalReviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-gray-500">
              <MapPin className="w-3 h-3" />
              <span className="text-sm">{shop.city}, {shop.region}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-around py-4 border-y border-gray-100 mb-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{shop.totalProducts}</p>
            <p className="text-xs text-gray-500">Products</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{shop.totalSales}</p>
            <p className="text-xs text-gray-500">Sales</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{shop.rating.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{followerCount}</p>
            <p className="text-xs text-gray-500">Followers</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleFollow}
            className={`flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 ${
              isFollowing
                ? 'bg-gray-100 text-gray-700'
                : 'bg-primary-600 text-white'
            }`}
          >
            <Heart size={18} className={isFollowing ? 'fill-red-500 text-red-500' : ''} />
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button
            onClick={handleChat}
            className="flex-1 py-2.5 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <MessageCircle size={18} />
            Chat
          </button>
        </div>

        {/* Description */}
        {shop.description && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-gray-600 text-sm">{shop.description}</p>
          </div>
        )}

        {/* Contact */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Contact</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {shop.phone && <p>Phone: {shop.phone}</p>}
            {shop.email && <p>Email: {shop.email}</p>}
            {shop.address && <p>Address: {shop.address}</p>}
          </div>
        </div>

        {/* Social Links */}
        {shop.socialLinks && Object.keys(shop.socialLinks).length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Social</h3>
            <div className="flex gap-3">
              {shop.socialLinks.facebook && (
                <a href={shop.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">
                  Facebook
                </a>
              )}
              {shop.socialLinks.instagram && (
                <a href={shop.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">
                  Instagram
                </a>
              )}
              {shop.socialLinks.tiktok && (
                <a href={shop.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">
                  TikTok
                </a>
              )}
              {shop.socialLinks.website && (
                <a href={shop.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600">
                  Website
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="bg-white mt-2 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Products ({products.length})</h3>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1"
            >
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low</option>
              <option value="price_high">Price: High</option>
              <option value="popular">Popular</option>
            </select>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No products yet</p>
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>

      {showQR && (
        <QRModal
          url={`${window.location.origin}/shop/${shopId}`}
          title={shop.name}
          onClose={() => setShowQR(false)}
        />
      )}
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
      <Link to={`/product/${product.id}`} className="bg-gray-50 rounded-xl overflow-hidden flex">
        <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
          )}
        </div>
        <div className="p-3 flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h4>
          <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/product/${product.id}`} className="bg-gray-50 rounded-xl overflow-hidden">
      <div className="aspect-square bg-gray-100">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{product.title}</h4>
        <span className="text-base font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
      </div>
    </Link>
  );
};
