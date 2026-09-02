import React, { useState, useEffect } from 'react';
import { ArrowLeft, Tag } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Offer } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import OfferCard from '../../components/offer/OfferCard';
import toast from 'react-hot-toast';

export const OffersPage: React.FC = () => {
  const { user } = useAuthStore();
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user]);

  const fetchOffers = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sentQuery = query(
        collection(db, 'offers'),
        where('buyerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const sentSnapshot = await getDocs(sentQuery);
      const sentData = sentSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Offer));
      setSentOffers(sentData);

      const receivedQuery = query(
        collection(db, 'offers'),
        where('sellerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      const receivedData = receivedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Offer));
      setReceivedOffers(receivedData);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });
      toast.success('Offer accepted');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to accept offer');
    }
  };

  const handleReject = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      toast.success('Offer rejected');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to reject offer');
    }
  };

  const handleCounter = async (offerId: string) => {
    const counterPrice = prompt('Enter counter offer price:');
    if (!counterPrice || isNaN(Number(counterPrice))) return;
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'countered',
        price: Number(counterPrice),
        updatedAt: serverTimestamp(),
      });
      toast.success('Counter offer sent');
      fetchOffers();
    } catch (error) {
      toast.error('Failed to send counter offer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => history.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <h1 className="ml-2 text-lg font-semibold">Offers</h1>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Received Offers */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Received Offers</h2>
              {receivedOffers.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500">No received offers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      type="received"
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onCounter={handleCounter}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sent Offers */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Sent Offers</h2>
              {sentOffers.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-500">No sent offers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sentOffers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} type="sent" />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
