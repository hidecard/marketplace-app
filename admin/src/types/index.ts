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
  verified: boolean;
  verificationStatus: 'not_requested' | 'pending' | 'approved' | 'rejected';
  rating: number;
  totalReviews: number;
  totalProducts: number;
  totalSales: number;
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
  status: 'active' | 'inactive' | 'sold' | 'hidden';
  views: number;
  createdAt: Date;
  updatedAt: Date;
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
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  status: OrderStatus;
  shippingAddress: Address;
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
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  region: string;
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
  updatedAt?: Date;
}

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalShops: number;
  verifiedShops: number;
  totalProducts: number;
  totalOrders: number;
  completedOrders: number;
  pendingVerifications: number;
  pendingReports: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
