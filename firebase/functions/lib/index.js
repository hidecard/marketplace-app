"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.toggleShopFollow = exports.incrementProductViews = exports.createChat = exports.saveProduct = exports.deleteExpense = exports.createExpense = exports.reviewReport = exports.createReport = exports.createReview = exports.respondToOffer = exports.createOffer = exports.markChatRead = exports.setTyping = exports.sendChatMessage = exports.updateOrderStatus = exports.createPOSSale = exports.createOrder = exports.adjustStock = exports.decrementStock = exports.reviewVerification = exports.submitVerification = exports.onCreateShop = exports.syncPhoneVerification = exports.api = exports.onMessageCreated = exports.onVerificationSubmitted = exports.trackEvent = exports.onOrderStatusChanged = exports.onOrderCreated = exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
const secureCallable = functions.runWith({
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
}).https.onCall;
// ============ USER FUNCTIONS ============
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
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
exports.onOrderCreated = functions.firestore
    .document('orders/{orderId}')
    .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;
    // Update platform stats
    await db.collection('platform_stats').doc('daily').set({
        ordersCount: admin.firestore.FieldValue.increment(1),
        lastOrderAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    // Send notification to seller
    const sellerDoc = await db.collection('shops').doc(order.shopId).get();
    if (sellerDoc.exists) {
        const shopData = sellerDoc.data();
        const ownerId = shopData === null || shopData === void 0 ? void 0 : shopData.ownerId;
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
const allowedTransitions = {
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
exports.onOrderStatusChanged = functions.firestore
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
            throw new functions.https.HttpsError('failed-precondition', `Invalid order status transition from ${before.status} to ${after.status}`);
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
exports.trackEvent = secureCallable(async (data, context) => {
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
exports.onVerificationSubmitted = functions.firestore
    .document('verification_requests/{requestId}')
    .onWrite(async (change, context) => {
    var _a;
    if (!change.after.exists)
        return;
    const request = change.after.data();
    if (!request)
        return;
    const previousStatus = change.before.exists ? (_a = change.before.data()) === null || _a === void 0 ? void 0 : _a.status : null;
    if (request.status !== 'pending' || previousStatus === 'pending')
        return;
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
exports.onMessageCreated = functions.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onCreate(async (snap, context) => {
    var _a;
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
    const participants = ((_a = chatDoc.data()) === null || _a === void 0 ? void 0 : _a.participants) || [];
    // Send notification to other participants
    const otherParticipants = participants.filter((p) => p !== message.senderId);
    const batch = db.batch();
    otherParticipants.forEach((participantId) => {
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
exports.api = functions.https.onRequest(async (req, res) => {
    // This will be expanded with proper routing
    res.json({ status: 'API is running' });
});
// ============ Callable functions (V1 secure backend) ============
var callables_1 = require("./callables");
Object.defineProperty(exports, "syncPhoneVerification", { enumerable: true, get: function () { return callables_1.syncPhoneVerification; } });
Object.defineProperty(exports, "onCreateShop", { enumerable: true, get: function () { return callables_1.onCreateShop; } });
Object.defineProperty(exports, "submitVerification", { enumerable: true, get: function () { return callables_1.submitVerification; } });
Object.defineProperty(exports, "reviewVerification", { enumerable: true, get: function () { return callables_1.reviewVerification; } });
Object.defineProperty(exports, "decrementStock", { enumerable: true, get: function () { return callables_1.decrementStock; } });
Object.defineProperty(exports, "adjustStock", { enumerable: true, get: function () { return callables_1.adjustStock; } });
Object.defineProperty(exports, "createOrder", { enumerable: true, get: function () { return callables_1.createOrder; } });
Object.defineProperty(exports, "createPOSSale", { enumerable: true, get: function () { return callables_1.createPOSSale; } });
Object.defineProperty(exports, "updateOrderStatus", { enumerable: true, get: function () { return callables_1.updateOrderStatus; } });
Object.defineProperty(exports, "sendChatMessage", { enumerable: true, get: function () { return callables_1.sendChatMessage; } });
Object.defineProperty(exports, "setTyping", { enumerable: true, get: function () { return callables_1.setTyping; } });
Object.defineProperty(exports, "markChatRead", { enumerable: true, get: function () { return callables_1.markChatRead; } });
Object.defineProperty(exports, "createOffer", { enumerable: true, get: function () { return callables_1.createOffer; } });
Object.defineProperty(exports, "respondToOffer", { enumerable: true, get: function () { return callables_1.respondToOffer; } });
Object.defineProperty(exports, "createReview", { enumerable: true, get: function () { return callables_1.createReview; } });
Object.defineProperty(exports, "createReport", { enumerable: true, get: function () { return callables_1.createReport; } });
Object.defineProperty(exports, "reviewReport", { enumerable: true, get: function () { return callables_1.reviewReport; } });
Object.defineProperty(exports, "createExpense", { enumerable: true, get: function () { return callables_1.createExpense; } });
Object.defineProperty(exports, "deleteExpense", { enumerable: true, get: function () { return callables_1.deleteExpense; } });
Object.defineProperty(exports, "saveProduct", { enumerable: true, get: function () { return callables_1.saveProduct; } });
Object.defineProperty(exports, "createChat", { enumerable: true, get: function () { return callables_1.createChat; } });
Object.defineProperty(exports, "incrementProductViews", { enumerable: true, get: function () { return callables_1.incrementProductViews; } });
Object.defineProperty(exports, "toggleShopFollow", { enumerable: true, get: function () { return callables_1.toggleShopFollow; } });
Object.defineProperty(exports, "deleteProduct", { enumerable: true, get: function () { return callables_1.deleteProduct; } });
//# sourceMappingURL=index.js.map