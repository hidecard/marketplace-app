import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../stores/authStore';
import { User } from '../types';

export const useAuth = () => {
  const { user, loading, setUser, setLoading, setAdmin } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = { uid: userSnap.id, ...userSnap.data() } as User;
            setUser(userData);
            setAdmin(userData.role === 'admin' && userData.status === 'active');
          } else {
            setUser(null);
            setAdmin(false);
          }
        } else {
          setUser(null);
          setAdmin(false);
        }
      } catch (error) {
        console.error('Admin role lookup failed:', error);
        setUser(null);
        setAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading, setAdmin]);

  return { user, loading };
};
