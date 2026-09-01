import { create } from 'zustand';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  shopId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  shopId: null,
  addItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.productId === item.productId);
      if (existingIndex > -1) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += item.quantity;
        newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].price;
        return { items: newItems, shopId: item.shopId };
      }
      return { items: [...state.items, item], shopId: item.shopId };
    }),
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),
  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity, subtotal: quantity * i.price } : i
      ),
    })),
  clearCart: () => set({ items: [], shopId: null }),
  getTotal: () => get().items.reduce((sum, item) => sum + item.subtotal, 0),
}));
