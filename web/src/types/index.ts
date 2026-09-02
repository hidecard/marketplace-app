import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface User {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string;
  photoURL: string | null;
  role: 'user' | 'admin';
  phoneVerified: boolean;
  shopVerified: boolean;
  status: 'active' | 'suspended' | 'banned';
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  coverImage: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  lat?: number;
  lng?: number;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    website?: string;
  };
  verified: boolean;
  verificationStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
  rating: number;
  totalReviews: number;
  totalProducts: number;
  totalSales: number;
  totalFollowers: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  shopId: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  categoryId: string;
  images: string[];
  condition: 'new' | 'used' | 'refurbished';
  stock: number;
  sku?: string;
  barcode?: string;
  weight?: number;
  status: 'active' | 'inactive' | 'sold' | 'hidden';
  views: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId: string | null;
  order: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  shopId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'kbzpay' | 'wavepay' | 'bank_transfer' | 'other' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: OrderStatus;
  shippingAddress: Address;
  note?: string;
  codRejectionCount?: number;
  codRejectionHistory?: Array<{ date: Date; reason?: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export interface Address {
  id?: string;
  userId?: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  isDefault?: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  productId?: string;
  orderId?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageBy?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'product' | 'offer';
  read: boolean;
  createdAt: Date;
}

export interface Offer {
  id: string;
  chatId: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  shopId: string;
  buyerId: string;
  orderId: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Date;
}

export interface POSSale {
  id: string;
  shopId: string;
  items: POSItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  createdAt: Date;
}

export interface POSItem {
  productId: string;
  title: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Expense {
  id: string;
  shopId: string;
  category: string;
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  shopId: string;
  type: 'increment' | 'decrement' | 'set';
  quantity: number;
  previousStock: number;
  newStock: number;
  userId: string;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  shopId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  shopId: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  description: string;
  facebookPage?: string;
  socialLinks?: string[];
  shopPhotos: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  reviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'product' | 'shop' | 'user';
  targetId: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNote?: string;
  createdAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: Date;
  createdAt: Date;
}

export const createUserData = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUserData = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { uid: userSnap.id, ...userSnap.data() } as User;
  }
  return null;
};

export const updateUserData = async (uid: string, data: Partial<User>) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};
