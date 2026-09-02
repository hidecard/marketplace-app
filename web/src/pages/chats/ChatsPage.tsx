import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Chat } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime } from '../../utils/helpers';

export const ChatsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [chats, setChats] = useState<(Chat & { otherUserName?: string; otherUserPhoto?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  const fetchChats = () => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Chat));

      const chatsWithUserInfo = await Promise.all(
        chatData.map(async (chat) => {
          const otherUserId = chat.participants.find((p) => p !== user.uid);
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...chat,
                otherUserName: userData.displayName || 'Unknown',
                otherUserPhoto: userData.photoURL,
              };
            }
          }
          return { ...chat, otherUserName: 'Unknown' };
        })
      );

      setChats(chatsWithUserInfo);
      setLoading(false);
    });

    return unsubscribe;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="flex items-center px-4 h-14">
          <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="ml-2 text-lg font-semibold">Messages</h1>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Messages Yet</h2>
            <p className="text-gray-500">Start chatting with sellers from product pages</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <Link
                key={chat.id}
                to={`/chats/${chat.id}`}
                className="bg-white rounded-xl p-4 flex items-center gap-3 block hover:bg-gray-50"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {chat.otherUserPhoto ? (
                    <img src={chat.otherUserPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-600 font-medium">
                      {chat.otherUserName?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">{chat.otherUserName}</h3>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatDateTime(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
