import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image, Tag, X } from 'lucide-react';
import { collection, query, where, orderBy, addDoc, doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Message, Offer } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

export const ChatDetailPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [productId, setProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      subscribeToMessages();
      subscribeToOffers();
    }
  }, [chatId]);

  useEffect(() => {
    if (messages.length > 0 || offers.length > 0) {
      setLoading(false);
    } else {
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [messages, offers]);

  const subscribeToMessages = () => {
    if (!chatId) return;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(data);
    });
    return unsubscribe;
  };

  const subscribeToOffers = () => {
    if (!chatId) return;
    const q = query(
      collection(db, 'offers'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Offer));
      setOffers(data);
    });
    return unsubscribe;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !chatId || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        content: newMessage.trim(),
        type: 'text',
        read: false,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: newMessage.trim(),
        lastMessageBy: user.uid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSendOffer = async () => {
    if (!user || !chatId || !offerPrice || isNaN(Number(offerPrice))) {
      toast.error('Please enter a valid price');
      return;
    }
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        toast.error('Chat not found');
        return;
      }
      const chatData = chatDoc.data();
      const participants = chatData.participants as string[];
      const otherUserId = participants.find((id) => id !== user.uid);
      if (!otherUserId) {
        toast.error('Unable to determine recipient');
        return;
      }

      await addDoc(collection(db, 'offers'), {
        chatId,
        productId: productId || '',
        buyerId: user.uid,
        sellerId: otherUserId,
        price: Number(offerPrice),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success('Offer sent');
      setShowOfferModal(false);
      setOfferPrice('');
      setProductId('');
    } catch (error) {
      toast.error('Failed to send offer');
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });
      toast.success('Offer accepted');
    } catch (error) {
      toast.error('Failed to accept offer');
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
      toast.success('Offer rejected');
    } catch (error) {
      toast.error('Failed to reject offer');
    }
  };

  const handleCounterOffer = async (offerId: string) => {
    const price = prompt('Enter counter offer price:');
    if (!price || isNaN(Number(price))) return;
    try {
      await updateDoc(doc(db, 'offers', offerId), {
        status: 'countered',
        price: Number(price),
        updatedAt: serverTimestamp(),
      });
      toast.success('Counter offer sent');
    } catch (error) {
      toast.error('Failed to send counter offer');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate('/chats')} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <div className="ml-2 flex-1">
            <h1 className="font-semibold text-gray-900">Chat</h1>
          </div>
          <button
            onClick={() => setShowOfferModal(true)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-full"
          >
            <Tag size={20} />
          </button>
        </div>
      </header>

      {/* Offers */}
      {offers.length > 0 && (
        <div className="p-4 space-y-3">
          {offers.map((offer) => (
            <div key={offer.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{formatCurrency(offer.price)} Ks</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  offer.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  offer.status === 'countered' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {offer.status}
                </span>
              </div>
              {offer.status === 'pending' && offer.sellerId === user?.uid && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptOffer(offer.id)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRejectOffer(offer.id)}
                    className="flex-1 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleCounterOffer(offer.id)}
                    className="flex-1 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm font-medium"
                  >
                    Counter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === user?.uid;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
                    {formatDateTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="flex items-end gap-3">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <Image size={22} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-2xl resize-none focus:ring-2 focus:ring-primary-500 focus:bg-white max-h-32"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      {/* Send Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send Offer</h3>
              <button onClick={() => setShowOfferModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product ID (optional)</label>
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter product ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer Price (Ks)</label>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter offer price"
                />
              </div>
              <button
                onClick={handleSendOffer}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-semibold"
              >
                Send Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
