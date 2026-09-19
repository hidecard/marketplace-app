import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../stores/authStore';
import { User } from '../types';
import { requestNotificationPermission, onForegroundMessage } from '../services/notifications';

let messagingSwRegistered = false;

function registerMessagingServiceWorker(): void {
  if (messagingSwRegistered) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  messagingSwRegistered = true;
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js', { scope: '/' })
    .catch((err) => console.warn('[messaging-sw] registration failed:', err));
}

export const useAuth = () => {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    registerMessagingServiceWorker();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeSnapshot = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser({ uid: doc.id, ...doc.data() } as User);
          } else {
            setUser(null);
          }
          setLoading(false);
        });

        // Ask for notification permission after a successful sign-in.
        // Failures are silent — FCM is an enhancement, not a blocker.
        requestNotificationPermission(firebaseUser.uid).catch((err) =>
          console.warn('requestNotificationPermission failed:', err),
        );
        const unsubscribeForeground = onForegroundMessage((payload) => {
          // Forward a CustomEvent so any page can subscribe to in-app banners.
          window.dispatchEvent(new CustomEvent('fcm:foreground', { detail: payload }));
        });

        return () => {
          unsubscribeSnapshot();
          unsubscribeForeground();
        };
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return { user, loading };
};
