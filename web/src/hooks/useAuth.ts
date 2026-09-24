import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { laravelApi } from '../services/laravelApi';
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
  const useLaravelApi = import.meta.env.VITE_USE_LARAVEL_API === 'true';

  useEffect(() => {
    registerMessagingServiceWorker();
  }, []);

  useEffect(() => {
    if (useLaravelApi) {
      let cancelled = false;
      const initLaravelAuth = async () => {
        try {
          if (laravelApi.isAuthenticated) {
            const response = await laravelApi.getCurrentUser();
            if (!cancelled && !response.error && response.user) {
              const laravelUser = response.user;
              setUser({
                uid: String(laravelUser.id),
                email: laravelUser.email,
                displayName: laravelUser.name,
                phoneNumber: laravelUser.phone_number,
                role: laravelUser.role,
                phoneVerified: laravelUser.phone_verified,
                shopVerified: false,
                status: laravelUser.status,
                fcmToken: undefined,
                createdAt: new Date(laravelUser.created_at),
                updatedAt: new Date(laravelUser.updated_at),
              } as User);
            } else if (!cancelled) {
              setUser(null);
            }
          } else {
            if (!cancelled) setUser(null);
          }
        } catch (error) {
          console.error('Laravel auth initialization error:', error);
          if (!cancelled) setUser(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      initLaravelAuth();
      return () => { cancelled = true; };
    }

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

        requestNotificationPermission(firebaseUser.uid).catch((err) =>
          console.warn('requestNotificationPermission failed:', err),
        );
        const unsubscribeForeground = onForegroundMessage((payload) => {
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
  }, [setUser, setLoading, useLaravelApi]);

  return { user, loading };
};
