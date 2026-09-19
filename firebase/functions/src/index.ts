import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const secureCallable = functions.runWith({
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
}).https.onCall;

// ============ USER FUNCTIONS ============

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const userData = {
    uid: user.uid,
    email: user.email || null,
    phoneNumber: user.phoneNumber || null,
    displayName: user.displayName || '',
    photoURL: user.photoURL || null,
    role: 'user',
    phoneVerified: false,
    shopVerified: false,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(user.uid).set(userData);
});

// ============ ORDER FUNCTIONS ============

export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    // Update platform stats
    await db.collection('platform_stats').doc('daily').set(
      {
        ordersCount: admin.firestore.FieldValue.increment(1),
        lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Send notification to seller
    const sellerDoc = await db.collection('shops').doc(order.shopId).get();
    if (sellerDoc.exists) {
      const shopData = sellerDoc.data();
      const ownerId = shopData?.ownerId;

      await db.collection('notifications').add({
        userId: ownerId,
        type: 'new_order',
        title: 'New Order Received',
        body: `You have a new order #${orderId.slice(0, 8)}`,
        data: { orderId, type: 'order' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

const allowedTransitions: Record<string, string[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  rejected: [],
};

export const onOrderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    if (before.status !== after.status) {
      const validTransitions = allowedTransitions[before.status] || [];
      if (!validTransitions.includes(after.status)) {
        console.error(`Invalid status transition from ${before.status} to ${after.status} for order ${orderId}`);
        await change.after.ref.update({
          status: before.status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Invalid order status transition from ${before.status} to ${after.status}`
        );
      }

      await db.collection('notifications').add({
        userId: after.buyerId,
        type: 'order_status',
        title: 'Order Status Updated',
        body: `Your order #${orderId.slice(0, 8)} is now ${after.status}`,
        data: { orderId, status: after.status, type: 'order' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// ============ ANALYTICS FUNCTIONS ============

export const trackEvent = secureCallable(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const { eventName, params } = data;

  const allowedEvents = new Set([
    'sign_up', 'phone_verified', 'login', 'product_view', 'search', 'shop_view',
    'favorite_added', 'chat_started', 'offer_sent', 'checkout_started',
    'order_placed', 'order_completed', 'order_cancelled', 'shop_created',
    'verification_requested', 'shop_verified', 'pos_opened', 'pos_sale_completed',
    'receipt_printed',
  ]);
  if (typeof eventName !== 'string' || !allowedEvents.has(eventName)) {
    throw new functions.https.HttpsError('invalid-argument', 'Event name is required');
  }

  await db.collection('analytics_events').add({
    eventName,
    params: params || {},
    userId: context.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ============ VERIFICATION FUNCTIONS ============

export const onVerificationSubmitted = functions.firestore
  .document('verification_requests/{requestId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;
    const request = change.after.data();
    if (!request) return;
    const previousStatus = change.before.exists ? change.before.data()?.status : null;
    if (request.status !== 'pending' || previousStatus === 'pending') return;

    // Notify admins
    const adminsSnapshot = await db
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    const batch = db.batch();

    adminsSnapshot.forEach((adminDoc) => {
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId: adminDoc.id,
        type: 'verification_request',
        title: 'New Shop Verification Request',
        body: `${request.shopName} has submitted for verification`,
        data: { requestId: context.params.requestId, type: 'verification' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  });

// ============ CHAT FUNCTIONS ============

export const onMessageCreated = functions.firestore
  .document('chats/{chatId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const chatId = context.params.chatId;

    // Update chat last message
    await db.collection('chats').doc(chatId).update({
      lastMessage: message.content,
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageBy: message.senderId,
    });

    // Get chat participants
    const chatDoc = await db.collection('chats').doc(chatId).get();
    const participants = chatDoc.data()?.participants || [];

    // Send notification to other participants
    const otherParticipants = participants.filter((p: string) => p !== message.senderId);

    const batch = db.batch();
    otherParticipants.forEach((participantId: string) => {
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        userId: participantId,
        type: 'new_message',
        title: 'New Message',
        body: message.content.substring(0, 100),
        data: { chatId, type: 'message' },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  });

// ============ API ENDPOINT ============

export const api = functions.https.onRequest(async (req, res) => {
  // This will be expanded with proper routing
  res.json({ status: 'API is running' });
});

// ============ Callable functions (V1 secure backend) ============
export {
  syncPhoneVerification,
  onCreateShop,
  submitVerification,
  reviewVerification,
  decrementStock,
  adjustStock,
  createOrder,
  createPOSSale,
  updateOrderStatus,
  sendChatMessage,
  setTyping,
  markChatRead,
  createOffer,
  respondToOffer,
  createReview,
  createReport,
  reviewReport,
  createExpense,
  deleteExpense,
  saveProduct,
  createChat,
  incrementProductViews,
  toggleShopFollow,
  deleteProduct,
} from './callables';
