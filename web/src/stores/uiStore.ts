import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  businessMode: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBusinessMode: (mode: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: false,
  businessMode: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setBusinessMode: (mode) => set({ businessMode: mode }),
}));
