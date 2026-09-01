export const COLLECTIONS = {
  USERS: 'users',
  SHOPS: 'shops',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  FAVORITES: 'favorites',
  SHOP_FOLLOWERS: 'shop_followers',
  ADDRESSES: 'addresses',
  CHATS: 'chats',
  MESSAGES: 'messages',
  OFFERS: 'offers',
  ORDERS: 'orders',
  REVIEWS: 'notifications',
  NOTIFICATIONS: 'notifications',
  VERIFICATION_REQUESTS: 'verification_requests',
  REPORTS: 'reports',
  POS_SALES: 'pos_sales',
  EXPENSES: 'expenses',
  INVENTORY_MOVEMENTS: 'inventory_movements',
  BANNERS: 'banners',
  PLATFORM_STATS: 'platform_stats',
  APP_SETTINGS: 'app_settings',
} as const;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
} as const;

export const VERIFICATION_STATUS = {
  NOT_REQUESTED: 'not_requested',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
} as const;

export const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  COUNTERED: 'countered',
  EXPIRED: 'expired',
} as const;

export const PRODUCT_CONDITION = {
  NEW: 'new',
  USED: 'used',
  REFURBISHED: 'refurbished',
} as const;

export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SOLD: 'sold',
  HIDDEN: 'hidden',
} as const;

export const PAYMENT_METHOD = {
  CASH: 'cash',
  KBZPAY: 'kbzpay',
  WAVE_PAY: 'wavepay',
  BANK_TRANSFER: 'bank_transfer',
  OTHER: 'other',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;

export const REPORT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export const REPORT_REASONS = [
  'Scam',
  'Fake Product',
  'Counterfeit',
  'Wrong Info',
  'Spam',
  'Harassment',
  'Illegal Product',
  'Other',
] as const;

export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  ORDER_STATUS: 'order_status',
  NEW_MESSAGE: 'new_message',
  NEW_OFFER: 'new_offer',
  VERIFICATION_RESULT: 'verification_result',
  NEW_REVIEW: 'new_review',
  LOW_STOCK: 'low_stock',
  PROMOTION: 'promotion',
} as const;
