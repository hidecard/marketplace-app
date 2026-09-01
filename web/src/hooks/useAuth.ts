import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../stores/authStore';
import { User } from '../types';

export const useAuth = () => {
  const { user, loading, setUser, setLoading, setPhoneVerified } = useAuthStore();

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
        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  const updatePhoneVerified = async (uid: string, phoneVerified: boolean) => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      phoneVerified,
      updatedAt: new Date(),
    });
    setPhoneVerified(phoneVerified);
  };

  return { user, loading, updatePhoneVerified };
};
