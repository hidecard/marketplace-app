import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Send, Flag } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Order, Review } from '../types';
import { formatDate } from '../utils/helpers';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export const WriteReviewPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
        setOrder(orderData);

        // Check for existing review
        const q = query(
          collection(db, 'reviews'),
          where('orderId', '==', orderId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const reviewData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Review;
          setExistingReview(reviewData);
          setRating(reviewData.rating);
          setComment(reviewData.comment);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user || rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: order.items?.[0]?.productId || '',
        shopId: order.shopId,
        buyerId: user.uid,
        orderId: order.id,
        rating,
        comment,
        createdAt: serverTimestamp(),
      });
      toast.success('Review submitted!');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to={`/orders/${orderId}`} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Write Review</h1>
        </div>
      </header>

      <div className="p-4">
        {/* Product Info */}
        <div className="bg-white rounded-xl p-4 flex gap-4 mb-4">
          <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
            {order.items?.[0]?.image ? (
              <img src={order.items[0].image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{order.items?.[0]?.title}</h3>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          </div>
        </div>

        {existingReview ? (
          <div className="bg-white rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={32}
                    className={star <= existingReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                  />
                ))}
              </div>
              <p className="text-gray-500">You reviewed this on {formatDate(existingReview.createdAt)}</p>
            </div>
            {existingReview.comment && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{existingReview.comment}</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6">
            {/* Rating */}
            <div className="text-center mb-6">
              <p className="text-lg font-medium text-gray-900 mb-3">How was your experience?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1"
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Write your review (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                rows={4}
                placeholder="Share your experience with this product..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export const ReportPage: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const reportReasons = [
    'Scam',
    'Fake Product',
    'Counterfeit',
    'Wrong Info',
    'Spam',
    'Harassment',
    'Illegal Product',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason) {
      toast.error('Please select a reason');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: user.uid,
        targetType: type,
        targetId: id,
        reason,
        description,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      toast.success('Report submitted. We will review it shortly.');
      setReason('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <h1 className="ml-2 text-lg font-semibold">Report {type}</h1>
        </div>
      </header>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Flag className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Submit a Report</h2>
              <p className="text-sm text-gray-500">Help us keep the community safe</p>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Reason *</label>
            <div className="grid grid-cols-2 gap-2">
              {reportReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    reason === r
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="Please provide more details about your report..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !reason}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};
