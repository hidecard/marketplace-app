import { create } from 'zustand';
import { User } from '../types';
import { AuthService } from '../services/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setPhoneVerified: (phoneVerified: boolean) => void;
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setPhoneVerified: (phoneVerified) => set((state) => ({
    user: state.user ? { ...state.user, phoneVerified } : null,
  })),
  initializeAuth: async () => {
    set({ loading: true });
    try {
      if (AuthService.isEnabled) {
        const currentUser = await AuthService.getCurrentUser();
        set({ user: currentUser as User, loading: false });
      } else {
        // Firebase auth state listener would be handled elsewhere
        set({ loading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    await AuthService.logout();
    set({ user: null, loading: false });
  },
}));
