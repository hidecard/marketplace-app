import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const messaging = (() => {
  try {
    return getMessaging(getApp());
  } catch (error) {
    console.warn('Firebase Messaging not available in this environment:', error);
    return null;
  }
})();

export const requestNotificationPermission = async (userId: string): Promise<string | null> => {
  if (!messaging) return null;
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  if (Notification.permission === 'denied') {
    return null;
  }
  try {
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('VITE_FIREBASE_VAPID_KEY not set; skipping FCM token retrieval');
      return null;
    }
    const token = await getToken(messaging, { vapidKey });
    if (!token) return null;

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      updatedAt: serverTimestamp(),
    }).catch(async (err) => {
      // The user doc may not exist yet (e.g. phone-only sign-in that hasn't synced).
      // We silently swallow — next login will retry.
      console.warn('Failed to persist fcmToken:', err);
    });
    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};
