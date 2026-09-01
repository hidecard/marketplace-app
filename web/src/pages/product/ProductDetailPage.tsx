import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Heart, Share2, ShoppingCart, MessageCircle, Star, Shield, MapPin, Truck, QrCode } from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Product, Shop, Review } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { trackEvent } from '../../services/analytics';
import toast from 'react-hot-toast';
import QRModal from '../../components/offer/QRModal';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addItem } = useCartStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchReviews();
    }
  }, [productId]);

  const fetchProduct = async () => {
    if (!productId) return;
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        const productData = { id: productDoc.id, ...productDoc.data() } as Product;
        setProduct(productData);
        trackEvent('product_view', { product_id: productData.id, product_title: productData.title, price: productData.price });

        // Increment view count
        await updateDoc(doc(db, 'products', productId), {
          views: increment(1),
        });

        // Fetch shop
        if (productData.shopId) {
          const shopDoc = await getDoc(doc(db, 'shops', productData.shopId));
          if (shopDoc.exists()) {
            setShop({ id: shopDoc.id, ...shopDoc.data() } as Shop);
          }
        }

        // Fetch related products
        const relatedQuery = query(
          collection(db, 'products'),
          where('categoryId', '==', productData.categoryId),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          // limit(4)
        );
        const relatedSnapshot = await getDocs(relatedQuery);
        const related = relatedSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Product))
          .filter((p) => p.id !== productId)
          .slice(0, 4);
        setRelatedProducts(related);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!productId) return;
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc'),
        // limit(5)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    const qty = 1;
    if (qty > product.stock) {
      toast.error('Not enough stock available');
      return;
    }
    addItem({
      productId: product.id,
      shopId: product.shopId,
      title: product.title,
      image: product.images?.[0] || '',
      price: product.price,
      quantity: qty,
      subtotal: product.price * qty,
      stock: product.stock,
    });
    toast.success('Added to cart');
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  const handleChat = async () => {
    if (!user || !product) return;
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, product.sellerId],
        productId: product.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      trackEvent('chat_started', { product_id: product.id, product_title: product.title });
      navigate(`/chats/${chatRef.id}`);
    } catch (error) {
      toast.error('Failed to start chat');
    }
  };

  const toggleFavorite = async () => {
    if (!user || !product) {
      toast.error('Please login to add favorites');
      return;
    }
    try {
      await addDoc(collection(db, 'favorites'), {
        userId: user.uid,
        productId: product.id,
        createdAt: serverTimestamp(),
      });
      trackEvent('favorite_added', { product_id: product.id, product_title: product.title });
      setIsFavorite(true);
      toast.success('Added to favorites');
    } catch (error) {
      toast.error('Failed to add favorite');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.share({
        title: product?.title,
        text: `Check out ${product?.title} on Marketplace`,
        url,
      });
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 bg-white z-40 p-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="animate-pulse">
          <div className="aspect-square bg-gray-200" />
          <div className="p-4 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <button onClick={() => navigate(-1)} className="text-primary-600">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowQR(true)} className="p-2 rounded-full hover:bg-gray-100">
              <QrCode size={22} />
            </button>
            <button onClick={handleShare} className="p-2 rounded-full hover:bg-gray-100">
              <Share2 size={22} />
            </button>
            <button onClick={toggleFavorite} className="p-2 rounded-full hover:bg-gray-100">
              <Heart size={22} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
            </button>
          </div>
        </div>
      </header>

      {/* Product Images */}
      <div className="bg-white">
        <div className="aspect-square bg-gray-100 relative">
          {product.images?.length ? (
            <img
              src={product.images[selectedImage]}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Image Available
            </div>
          )}
          {product.condition === 'used' && (
            <span className="absolute top-4 left-4 bg-yellow-500 text-white text-sm px-3 py-1 rounded-full">
              Used
            </span>
          )}
        </div>
        {product.images && product.images.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto">
            {product.images.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                  index === selectedImage ? 'border-primary-600' : 'border-transparent'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white mt-2 p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{product.title}</h1>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-2xl font-bold text-primary-600">{formatCurrency(product.price)} Ks</span>
          {product.comparePrice && product.comparePrice > product.price && (
            <>
              <span className="text-lg text-gray-400 line-through">{formatCurrency(product.comparePrice)} Ks</span>
              <span className="text-sm bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                -{Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span className="capitalize">Condition: {product.condition}</span>
          <span>Stock: {product.stock}</span>
          <span>{product.views} views</span>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600 whitespace-pre-line">{product.description || 'No description available'}</p>
        </div>
      </div>

      {/* Shop Info */}
      {shop && (
        <Link to={`/shop/${shop.id}`} className="bg-white mt-2 p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
            {shop.logo ? (
              <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                {shop.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 truncate">{shop.name}</span>
              {shop.verified && <Shield className="w-4 h-4 text-primary-600 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm text-gray-600">{shop.rating.toFixed(1)} ({shop.totalReviews} reviews)</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-gray-500">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">{shop.city}</span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleChat();
            }}
            className="p-2 bg-primary-50 text-primary-600 rounded-full"
          >
            <MessageCircle size={20} />
          </button>
        </Link>
      )}

      {/* Delivery Info */}
      <div className="bg-white mt-2 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Delivery</h3>
        <div className="flex items-start gap-3">
          <Truck className="text-gray-400 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-gray-900 font-medium">Cash on Delivery Available</p>
            <p className="text-xs text-gray-500">Pay when you receive your order</p>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white mt-2 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Reviews ({reviews.length})</h3>
          {reviews.length > 0 && (
            <button className="text-sm text-primary-600">See all</button>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="bg-white mt-2 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Related Products</h3>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="bg-gray-50 rounded-xl overflow-hidden">
                <div className="aspect-square bg-gray-100">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />}
                </div>
                <div className="p-2">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{p.title}</h4>
                  <span className="text-sm font-bold text-primary-600">{formatCurrency(p.price)} Ks</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex items-center gap-3 z-50">
        <button
          onClick={handleChat}
          className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50"
        >
          <MessageCircle size={22} className="text-gray-700" />
        </button>
        <button
          onClick={handleAddToCart}
          className="flex-1 py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 flex items-center justify-center gap-2"
        >
          <ShoppingCart size={20} />
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
        >
          Buy Now
        </button>
      </div>
      {showQR && product && (
        <QRModal
          url={`${window.location.origin}/product/${product.id}`}
          title={product.title}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};
