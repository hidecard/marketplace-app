import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export const useNotifications = (userId: string | undefined) => {
  const sendNotification = async (
    targetUserId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) => {
    if (!userId) return;

    await addDoc(collection(db, 'notifications'), {
      userId: targetUserId,
      type,
      title,
      body,
      data: data || {},
      read: false,
      createdAt: serverTimestamp(),
    });
  };

  return { sendNotification };
};
