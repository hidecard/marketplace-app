import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

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

// ============ STOCK FUNCTIONS ============

export const updateStock = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { productId, quantity, type, shopId } = data;

  if (!productId || !quantity || !type || !shopId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const productRef = db.collection('products').doc(productId);

  await db.runTransaction(async (transaction) => {
    const productDoc = await transaction.get(productRef);

    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Product not found');
    }

    const productData = productDoc.data();
    const currentStock = productData?.stock || 0;

    let newStock: number;
    if (type === 'increment') {
      newStock = currentStock + quantity;
    } else if (type === 'decrement') {
      newStock = currentStock - quantity;
      if (newStock < 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient stock');
      }
    } else {
      newStock = quantity;
    }

    transaction.update(productRef, {
      stock: newStock,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record inventory movement
    const movementRef = db.collection('inventory_movements').doc();
    transaction.set(movementRef, {
      productId,
      shopId,
      type,
      quantity,
      previousStock: currentStock,
      newStock,
      userId: context.auth!.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});

// ============ NOTIFICATION FUNCTIONS ============

export const sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userId, title, body, data: notificationData } = data;

  const userDoc = await db.collection('users').doc(userId).get();
  const fcmToken = userDoc.data()?.fcmToken;

  if (!fcmToken) {
    return { success: false, message: 'No FCM token found' };
  }

  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: notificationData || {},
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, message: 'Failed to send notification' };
  }
});

// ============ ANALYTICS FUNCTIONS ============

export const trackEvent = functions.https.onCall(async (data, context) => {
  const { eventName, params } = data;

  if (!eventName) {
    throw new functions.https.HttpsError('invalid-argument', 'Event name is required');
  }

  await db.collection('analytics_events').add({
    eventName,
    params: params || {},
    userId: context.auth?.uid || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ============ VERIFICATION FUNCTIONS ============

export const onVerificationSubmitted = functions.firestore
  .document('verification_requests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();

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
