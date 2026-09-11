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
exports.deleteProduct = exports.toggleShopFollow = exports.incrementProductViews = exports.deleteExpense = exports.createExpense = exports.reviewReport = exports.createReport = exports.createReview = exports.respondToOffer = exports.createOffer = exports.markChatRead = exports.setTyping = exports.sendChatMessage = exports.adjustStock = exports.updateOrderStatus = exports.createPOSSale = exports.createOrder = exports.decrementStock = exports.reviewVerification = exports.submitVerification = exports.onCreateShop = void 0;
exports.requireAuth = requireAuth;
exports.requireString = requireString;
exports.optionalString = optionalString;
exports.slugify = slugify;
exports.requireMoneyInt = requireMoneyInt;
exports.requirePositiveInt = requirePositiveInt;
exports.canTransition = canTransition;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const messaging = admin.messaging();
function requireAuth(req) {
    if (!req.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
    }
    return req.auth.uid;
}
function requireString(value, field, max = 500) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', `${field} is required`);
    }
    if (value.length > max) {
        throw new functions.https.HttpsError('invalid-argument', `${field} too long`);
    }
    return value.trim();
}
function optionalString(value, field, max = 500) {
    if (value == null || value === '')
        return undefined;
    if (typeof value !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a string`);
    }
    if (value.length > max) {
        throw new functions.https.HttpsError('invalid-argument', `${field} too long`);
    }
    return value;
}
function slugify(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}
// Money is integer kyat. Validate that the client-supplied amount is a non-negative integer.
function requireMoneyInt(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a non-negative integer`);
    }
    return value;
}
function requirePositiveInt(value, field) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must be a positive integer`);
    }
    return value;
}
const ORDER_TRANSITIONS = {
    pending: ['confirmed', 'cancelled', 'rejected'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['shipped', 'cancelled'],
    shipped: ['out_for_delivery', 'delivered'],
    out_for_delivery: ['delivered', 'shipped'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
    rejected: [],
};
function canTransition(from, to) {
    var _a, _b;
    return (_b = (_a = ORDER_TRANSITIONS[from]) === null || _a === void 0 ? void 0 : _a.includes(to)) !== null && _b !== void 0 ? _b : false;
}
function canBuyerCancel(status) {
    return status === 'pending' || status === 'confirmed';
}
// ============ onCreateShop ============
exports.onCreateShop = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const uid = requireAuth({ auth: context.auth, data });
    const name = requireString(data.name, 'name', 80);
    const slugInput = (_a = optionalString(data.slug, 'slug', 60)) !== null && _a !== void 0 ? _a : slugify(name);
    const slug = slugify(slugInput);
    if (!slug) {
        throw new functions.https.HttpsError('invalid-argument', 'slug is required');
    }
    const description = (_b = optionalString(data.description, 'description', 1000)) !== null && _b !== void 0 ? _b : '';
    const phone = requireString(data.phone, 'phone', 40);
    const email = optionalString(data.email, 'email', 120);
    const address = requireString(data.address, 'address', 200);
    const city = requireString(data.city, 'city', 80);
    const region = requireString(data.region, 'region', 80);
    const logo = optionalString(data.logo, 'logo', 500);
    // Reject if the user already has a shop.
    const existing = await db.collection('shops')
        .where('ownerId', '==', uid)
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new functions.https.HttpsError('already-exists', 'You already have a shop');
    }
    // Reject duplicate slugs.
    const slugDup = await db.collection('shops')
        .where('slug', '==', slug)
        .limit(1)
        .get();
    if (!slugDup.empty) {
        throw new functions.https.HttpsError('already-exists', 'Slug already in use');
    }
    const shopRef = db.collection('shops').doc();
    const memberRef = shopRef.collection('members').doc(uid);
    const userRef = db.collection('users').doc(uid);
    const shopData = {
        id: shopRef.id,
        ownerId: uid,
        name,
        slug,
        description,
        logo: logo !== null && logo !== void 0 ? logo : null,
        phone,
        email: email !== null && email !== void 0 ? email : '',
        address,
        city,
        region,
        lat: null,
        lng: null,
        socialLinks: { facebook: '', instagram: '', tiktok: '', website: '' },
        verified: false,
        verificationStatus: 'not_requested',
        rating: 0,
        totalReviews: 0,
        totalProducts: 0,
        totalSales: 0,
        totalFollowers: 0,
        businessModeEnabled: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const memberData = {
        uid,
        role: 'owner',
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.runTransaction(async (tx) => {
        tx.set(shopRef, shopData);
        tx.set(memberRef, memberData);
        tx.update(userRef, { shopVerified: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    });
    // Set a custom claim so the user can read their own shop membership doc directly.
    await admin.auth().setCustomUserClaims(uid, { shopId: shopRef.id, role: 'user' });
    return shopData;
});
// ============ submitVerification ============
exports.submitVerification = functions.https.onCall(async (data, context) => {
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const nrcUrl = requireString(data.nrcUrl, 'nrcUrl', 500);
    const licenseUrl = optionalString(data.licenseUrl, 'licenseUrl', 500);
    const selfieUrl = requireString(data.selfieUrl, 'selfieUrl', 500);
    const note = optionalString(data.note, 'note', 500);
    const shopRef = db.collection('shops').doc(shopId);
    const shop = await shopRef.get();
    if (!shop.exists) {
        throw new functions.https.HttpsError('not-found', 'Shop not found');
    }
    if (shop.data().ownerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
    }
    const existing = await db.collection('verificationRequests')
        .where('shopId', '==', shopId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new functions.https.HttpsError('already-exists', 'A pending request already exists');
    }
    const ref = db.collection('verificationRequests').doc();
    await ref.set({
        id: ref.id,
        userId: uid,
        shopId,
        nrcUrl,
        licenseUrl: licenseUrl !== null && licenseUrl !== void 0 ? licenseUrl : null,
        selfieUrl,
        note: note !== null && note !== void 0 ? note : '',
        status: 'pending',
        adminNote: null,
        reviewedBy: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await shopRef.update({ verificationStatus: 'pending' });
    return { id: ref.id };
});
// ============ reviewVerification (admin) ============
exports.reviewVerification = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const adminUid = requireAuth({ auth: context.auth, data });
    const userDoc = await db.collection('users').doc(adminUid).get();
    if (((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const requestId = requireString(data.requestId, 'requestId');
    const decision = data.decision;
    if (decision !== 'approved' && decision !== 'rejected') {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be approved|rejected');
    }
    const note = (_b = optionalString(data.note, 'note', 500)) !== null && _b !== void 0 ? _b : '';
    const ref = db.collection('verificationRequests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Request not found');
    }
    const request = snap.data();
    if (request.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Request already reviewed');
    }
    await db.runTransaction(async (tx) => {
        var _a;
        tx.update(ref, {
            status: decision,
            adminNote: note,
            reviewedBy: adminUid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const shopRef = db.collection('shops').doc(request.shopId);
        if (decision === 'approved') {
            tx.update(shopRef, {
                verified: true,
                verificationStatus: 'approved',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const shopSnap = await shopRef.get();
            const ownerId = shopSnap.data().ownerId;
            tx.update(db.collection('users').doc(ownerId), {
                shopVerified: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // Refresh custom claim so firestore rules see shopVerified.
            const claims = (_a = (await admin.auth().getUser(ownerId)).customClaims) !== null && _a !== void 0 ? _a : {};
            await admin.auth().setCustomUserClaims(ownerId, Object.assign(Object.assign({}, claims), { shopVerified: true }));
        }
        else {
            tx.update(shopRef, {
                verificationStatus: 'rejected',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
    return { ok: true };
});
// ============ decrementStock (atomic) ============
exports.decrementStock = functions.https.onCall(async (data, context) => {
    var _a;
    requireAuth({ auth: context.auth, data });
    const productId = requireString(data.productId, 'productId');
    const qty = requirePositiveInt(data.quantity, 'quantity');
    const shopId = requireString(data.shopId, 'shopId');
    const reason = (_a = optionalString(data.reason, 'reason', 40)) !== null && _a !== void 0 ? _a : 'order';
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    const result = await db.runTransaction(async (tx) => {
        var _a;
        const productRef = db.collection('products').doc(productId);
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Product not found');
        }
        const product = productSnap.data();
        if (product.shopId !== shopId) {
            throw new functions.https.HttpsError('permission-denied', 'Shop mismatch');
        }
        const currentStock = (_a = product.stock) !== null && _a !== void 0 ? _a : 0;
        if (currentStock < qty) {
            throw new functions.https.HttpsError('failed-precondition', 'Insufficient stock');
        }
        // Idempotency: check the inventory_movements collection for an existing entry with this key.
        const idemRef = db.collection('inventory_movements').doc(idempotencyKey);
        const idemSnap = await tx.get(idemRef);
        if (idemSnap.exists) {
            return { alreadyProcessed: true, newStock: currentStock };
        }
        const newStock = currentStock - qty;
        tx.update(productRef, { stock: newStock, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.set(idemRef, {
            id: idempotencyKey,
            productId,
            shopId,
            type: 'decrement',
            quantity: -qty,
            newStock,
            reason,
            userId: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { alreadyProcessed: false, newStock };
    });
    return result;
});
exports.createOrder = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const uid = requireAuth({ auth: context.auth, data });
    const items = data.items;
    const address = data.address;
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    if (!Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'items required');
    }
    if (!address || typeof address !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'address required');
    }
    // Check idempotency first.
    const idemRef = db.collection('orders').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
        return idemSnap.data();
    }
    const result = await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d;
        // Group by shop. V1: all items must be from the same shop.
        const productRefs = items.map((i) => db.collection('products').doc(i.productId));
        const productSnaps = await tx.getAll(...productRefs);
        if (productSnaps.some((s) => !s.exists)) {
            throw new functions.https.HttpsError('not-found', 'One or more products not found');
        }
        const products = productSnaps.map((s) => s.data());
        const shopId = products[0].shopId;
        if (!products.every((p) => p.shopId === shopId)) {
            throw new functions.https.HttpsError('invalid-argument', 'All items must be from one shop');
        }
        // Validate stock + snapshot price/cost server-side.
        const lineItems = products.map((p, idx) => {
            var _a, _b, _c, _d;
            const requested = items[idx].quantity;
            if (((_a = p.stock) !== null && _a !== void 0 ? _a : 0) < requested) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient stock for ${p.title}`);
            }
            return {
                productId: p.id,
                title: p.title,
                image: (_b = (p.images && p.images[0])) !== null && _b !== void 0 ? _b : '',
                price: p.price,
                costPrice: (_c = p.costPrice) !== null && _c !== void 0 ? _c : p.price,
                quantity: requested,
                subtotal: p.price * requested,
                variantId: (_d = items[idx].variantId) !== null && _d !== void 0 ? _d : null,
            };
        });
        const subtotal = lineItems.reduce((s, l) => s + l.subtotal, 0);
        const deliveryFee = requireMoneyInt((_a = data.deliveryFee) !== null && _a !== void 0 ? _a : 0, 'deliveryFee');
        const discount = requireMoneyInt((_b = data.discount) !== null && _b !== void 0 ? _b : 0, 'discount');
        const total = subtotal + deliveryFee - discount;
        if (total < 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Total cannot be negative');
        }
        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
            .toString().padStart(3, '0')}`;
        const order = {
            id: idempotencyKey,
            orderNumber,
            customerId: uid,
            shopId,
            items: lineItems,
            shippingAddress: address,
            subtotal,
            deliveryFee,
            discount,
            total,
            status: 'pending',
            paymentMethod: (_c = data.paymentMethod) !== null && _c !== void 0 ? _c : 'cod',
            paymentStatus: 'pending',
            note: (_d = optionalString(data.note, 'note', 500)) !== null && _d !== void 0 ? _d : '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(idemRef, order);
        // Decrement stock + log inventory movements.
        lineItems.forEach((l) => {
            const productRef = db.collection('products').doc(l.productId);
            tx.update(productRef, {
                stock: admin.firestore.FieldValue.increment(-l.quantity),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const mvmtRef = db.collection('inventory_movements').doc(`${idempotencyKey}-${l.productId}`);
            tx.set(mvmtRef, {
                id: mvmtRef.id,
                productId: l.productId,
                shopId,
                type: 'sale',
                quantity: -l.quantity,
                newStock: admin.firestore.FieldValue.increment(-l.quantity),
                reason: `order:${idempotencyKey}`,
                userId: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        return order;
    });
    // After commit, send FCM to the seller.
    try {
        const shopDoc = await db.collection('shops').doc(result.shopId).get();
        const ownerId = (_a = shopDoc.data()) === null || _a === void 0 ? void 0 : _a.ownerId;
        if (ownerId) {
            const userDoc = await db.collection('users').doc(ownerId).get();
            const token = (_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.fcmToken;
            if (token) {
                await messaging.send({
                    token,
                    notification: {
                        title: 'New order received',
                        body: `Order ${result.orderNumber} — ${result.total} Ks`,
                    },
                    data: { type: 'order', orderId: result.id },
                });
            }
        }
    }
    catch (_) {
        // FCM failure should not roll back the order.
    }
    return result;
});
// ============ createPOSSale ============
exports.createPOSSale = functions.https.onCall(async (data, context) => {
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'items required');
    }
    // Verify shop ownership.
    const shopDoc = await db.collection('shops').doc(shopId).get();
    if (!shopDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Shop not found');
    }
    if (shopDoc.data().ownerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
    }
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    // Idempotency: a receipt with the same id should be returned.
    const idemRef = db.collection('pos_sales').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists)
        return idemSnap.data();
    const result = await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e;
        const productRefs = items.map((i) => db.collection('products').doc(i.productId));
        const productSnaps = await tx.getAll(...productRefs);
        if (productSnaps.some((s) => !s.exists)) {
            throw new functions.https.HttpsError('not-found', 'Product not found');
        }
        const products = productSnaps.map((s) => s.data());
        if (!products.every((p) => p.shopId === shopId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Items must be from this shop');
        }
        const lineItems = products.map((p, idx) => {
            var _a, _b, _c, _d;
            const q = items[idx].quantity;
            if (((_a = p.stock) !== null && _a !== void 0 ? _a : 0) < q) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient stock for ${p.title}`);
            }
            return {
                productId: p.id,
                title: p.title,
                image: (_b = (p.images && p.images[0])) !== null && _b !== void 0 ? _b : '',
                price: p.price,
                costPrice: (_c = p.costPrice) !== null && _c !== void 0 ? _c : p.price,
                quantity: q,
                subtotal: p.price * q,
                variantId: (_d = items[idx].variantId) !== null && _d !== void 0 ? _d : null,
            };
        });
        const subtotal = lineItems.reduce((s, l) => s + l.subtotal, 0);
        const discount = requireMoneyInt((_a = data.discount) !== null && _a !== void 0 ? _a : 0, 'discount');
        const tax = requireMoneyInt((_b = data.tax) !== null && _b !== void 0 ? _b : 0, 'tax');
        const total = subtotal - discount + tax;
        if (total < 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Total cannot be negative');
        }
        const sale = {
            id: idempotencyKey,
            shopId,
            cashierId: uid,
            items: lineItems,
            subtotal,
            discount,
            tax,
            total,
            paymentMethod: (_c = data.paymentMethod) !== null && _c !== void 0 ? _c : 'cash',
            customerPhone: (_d = optionalString(data.customerPhone, 'customerPhone', 40)) !== null && _d !== void 0 ? _d : '',
            note: (_e = optionalString(data.note, 'note', 500)) !== null && _e !== void 0 ? _e : '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(idemRef, sale);
        lineItems.forEach((l) => {
            tx.update(db.collection('products').doc(l.productId), {
                stock: admin.firestore.FieldValue.increment(-l.quantity),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const mvmtRef = db.collection('inventory_movements').doc(`pos-${idempotencyKey}-${l.productId}`);
            tx.set(mvmtRef, {
                id: mvmtRef.id,
                productId: l.productId,
                shopId,
                type: 'pos',
                quantity: -l.quantity,
                newStock: admin.firestore.FieldValue.increment(-l.quantity),
                reason: `pos:${idempotencyKey}`,
                userId: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        return sale;
    });
    return result;
});
// ============ updateOrderStatus ============
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    const uid = requireAuth({ auth: context.auth, data });
    const orderId = requireString(data.orderId, 'orderId');
    const to = requireString(data.status, 'status');
    if (!(to in ORDER_TRANSITIONS)) {
        throw new functions.https.HttpsError('invalid-argument', 'unknown status');
    }
    const note = (_a = optionalString(data.note, 'note', 500)) !== null && _a !== void 0 ? _a : '';
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    const result = await db.runTransaction(async (tx) => {
        var _a;
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found');
        }
        const order = orderSnap.data();
        const userDoc = await tx.get(db.collection('users').doc(uid));
        const isAdmin = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
        let allowed = isAdmin;
        if (!allowed) {
            if (order.buyerId === uid && to === 'cancelled' && canBuyerCancel(order.status)) {
                allowed = true;
            }
            else {
                const shopDoc = await tx.get(db.collection('shops').doc(order.shopId));
                allowed = shopDoc.exists && shopDoc.data().ownerId === uid;
            }
        }
        if (!allowed) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }
        const idemRef = db.collection('order_status_history').doc(idempotencyKey);
        const idemSnap = await tx.get(idemRef);
        if (idemSnap.exists) {
            return { ok: true, alreadyProcessed: true, status: order.status };
        }
        const from = order.status;
        if (!canTransition(from, to)) {
            throw new functions.https.HttpsError('failed-precondition', `Cannot transition from ${from} to ${to}`);
        }
        const updateData = {
            status: to,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (to === 'cancelled' && order.buyerId === uid) {
            updateData.codRejectionCount = admin.firestore.FieldValue.increment(1);
            updateData.codRejectionHistory = admin.firestore.FieldValue.arrayUnion({
                date: admin.firestore.FieldValue.serverTimestamp(),
                reason: note || 'Buyer cancelled',
                actor: uid,
            });
        }
        tx.update(orderRef, updateData);
        tx.set(idemRef, {
            id: idempotencyKey,
            orderId,
            from,
            to,
            actor: uid,
            note,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, alreadyProcessed: false, status: to };
    });
    try {
        const orderDoc = await db.collection('orders').doc(orderId).get();
        const customerId = (_b = orderDoc.data()) === null || _b === void 0 ? void 0 : _b.customerId;
        if (customerId) {
            const userDoc = await db.collection('users').doc(customerId).get();
            const token = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.fcmToken;
            if (token) {
                await messaging.send({
                    token,
                    notification: {
                        title: 'Order update',
                        body: `Your order ${orderDoc.data().orderNumber} is now ${to}`,
                    },
                    data: { type: 'order', orderId },
                });
            }
        }
    }
    catch (_) { /* ignore */ }
    return result;
});
// ============ adjustStock (manual adjustment by shop owner) ============
exports.adjustStock = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const uid = requireAuth({ auth: context.auth, data });
    const productId = requireString(data.productId, 'productId');
    const shopId = requireString(data.shopId, 'shopId');
    const type = data.type;
    const qty = requirePositiveInt(data.quantity, 'quantity');
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    const reason = (_a = optionalString(data.reason, 'reason', 80)) !== null && _a !== void 0 ? _a : 'manual';
    if (type !== 'increment' && type !== 'decrement' && type !== 'set') {
        throw new functions.https.HttpsError('invalid-argument', 'type must be increment|decrement|set');
    }
    // Authorize: shop owner or admin.
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role) === 'admin';
    if (!isAdmin) {
        const shopRef = db.collection('shops').doc(shopId);
        const shopDoc = await shopRef.get();
        if (!shopDoc.exists || shopDoc.data().ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
        }
    }
    const result = await db.runTransaction(async (tx) => {
        var _a;
        const productRef = db.collection('products').doc(productId);
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Product not found');
        }
        const product = productSnap.data();
        if (product.shopId !== shopId) {
            throw new functions.https.HttpsError('permission-denied', 'Shop mismatch');
        }
        const current = (_a = product.stock) !== null && _a !== void 0 ? _a : 0;
        let newStock;
        let delta;
        if (type === 'increment') {
            newStock = current + qty;
            delta = qty;
        }
        else if (type === 'decrement') {
            newStock = current - qty;
            delta = -qty;
        }
        else {
            newStock = qty;
            delta = qty - current;
        }
        if (newStock < 0) {
            throw new functions.https.HttpsError('failed-precondition', 'Stock cannot go below zero');
        }
        const idemRef = db.collection('inventory_movements').doc(idempotencyKey);
        const idemSnap = await tx.get(idemRef);
        if (idemSnap.exists) {
            return { alreadyProcessed: true, newStock: current };
        }
        tx.update(productRef, { stock: newStock, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        tx.set(idemRef, {
            id: idempotencyKey,
            productId,
            shopId,
            type: type === 'set' ? 'adjustment' : type,
            quantity: delta,
            newStock,
            reason,
            userId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { alreadyProcessed: false, newStock };
    });
    return result;
});
// ============ sendChatMessage ============
exports.sendChatMessage = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const chatId = requireString(data.chatId, 'chatId');
    const content = requireString(data.content, 'content', 2000);
    const type = (_a = optionalString(data.type, 'type', 20)) !== null && _a !== void 0 ? _a : 'text';
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    // Authorize: must be a participant.
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Chat not found');
    }
    const chat = chatSnap.data();
    if (!chat.participants || !chat.participants.includes(uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }
    // Idempotency: refuse to write the same message twice.
    const idemRef = db.collection('chats').doc(chatId).collection('messages').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
        return { id: idemRef.id, alreadyProcessed: true };
    }
    await db.runTransaction(async (tx) => {
        var _a;
        tx.set(idemRef, {
            id: idemRef.id,
            chatId,
            senderId: uid,
            content,
            type,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Clear typing indicator for this user; update chat metadata.
        const newTyping = {};
        Object.entries((_a = chat.typing) !== null && _a !== void 0 ? _a : {}).forEach(([k, v]) => {
            if (k !== uid)
                newTyping[k] = v;
        });
        tx.update(chatRef, {
            lastMessage: content,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            lastMessageBy: uid,
            typing: newTyping,
        });
    });
    // Push to the other participant(s) on commit.
    const otherIds = chat.participants.filter((p) => p !== uid);
    if (otherIds.length > 0) {
        const tokensSnap = await db.collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', otherIds.slice(0, 10))
            .get();
        const tokens = tokensSnap.docs
            .map((d) => d.data().fcmToken)
            .filter((t) => !!t);
        if (tokens.length > 0) {
            try {
                await messaging.sendEach(tokens.map((token) => ({
                    token,
                    notification: {
                        title: 'New message',
                        body: content.length > 80 ? content.substring(0, 77) + '...' : content,
                    },
                    data: { type: 'chat', chatId },
                })));
            }
            catch (_) { /* ignore push failures */ }
        }
    }
    return { id: idemRef.id, alreadyProcessed: false };
});
// ============ setTyping ============
exports.setTyping = functions.https.onCall(async (data, context) => {
    const uid = requireAuth({ auth: context.auth, data });
    const chatId = requireString(data.chatId, 'chatId');
    const typing = data.typing === true;
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists || !chatSnap.data().participants.includes(uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }
    await chatRef.update({
        [`typing.${uid}`]: typing ? Date.now() : admin.firestore.FieldValue.delete(),
    });
    return { ok: true };
});
// ============ markChatRead ============
exports.markChatRead = functions.https.onCall(async (data, context) => {
    const uid = requireAuth({ auth: context.auth, data });
    const chatId = requireString(data.chatId, 'chatId');
    const chatRef = db.collection('chats').doc(chatId);
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists || !chatSnap.data().participants.includes(uid)) {
        throw new functions.https.HttpsError('permission-denied', 'Not a participant');
    }
    // Atomically add uid to readBy and mark unread incoming messages as read.
    const unreadSnap = await db.collection('chats').doc(chatId).collection('messages')
        .where('senderId', '!=', uid)
        .where('read', '==', false)
        .get();
    const batch = db.batch();
    unreadSnap.docs.forEach((d) => batch.update(d.ref, { read: true }));
    batch.update(chatRef, { readBy: admin.firestore.FieldValue.arrayUnion(uid) });
    await batch.commit();
    return { marked: unreadSnap.size };
});
// ============ createOffer ============
exports.createOffer = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const productId = requireString(data.productId, 'productId');
    const price = requireMoneyInt(data.price, 'price');
    if (price <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'price must be > 0');
    }
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    const productRef = db.collection('products').doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Product not found');
    }
    const product = productSnap.data();
    const sellerId = product.sellerId || product.shopId;
    if (!sellerId) {
        throw new functions.https.HttpsError('failed-precondition', 'Product has no seller');
    }
    if (sellerId === uid) {
        throw new functions.https.HttpsError('failed-precondition', 'You cannot offer on your own product');
    }
    // Reject if the buyer already has an active offer for this product.
    const existing = await db.collection('offers')
        .where('productId', '==', productId)
        .where('buyerId', '==', uid)
        .where('status', 'in', ['pending', 'countered'])
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new functions.https.HttpsError('already-exists', 'You already have an active offer on this product');
    }
    const offerRef = db.collection('offers').doc(idempotencyKey);
    await offerRef.set({
        id: idempotencyKey,
        productId,
        buyerId: uid,
        sellerId,
        price,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Create / fetch chat and post the offer message via the chat callable path
    // (we just write the message + chat metadata directly here to keep this self-contained).
    const sorted = [uid, sellerId];
    sorted.sort();
    const chatId = sorted.join('_');
    const chatRef = db.collection('chats').doc(chatId);
    const msgRef = chatRef.collection('messages').doc(`${idempotencyKey}-offer`);
    const batch = db.batch();
    batch.set(chatRef, {
        id: chatId,
        participants: sorted,
        productId,
        lastMessage: `Offer: ${price} Ks`,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageBy: uid,
        readBy: [uid],
    }, { merge: true });
    batch.set(msgRef, {
        id: msgRef.id,
        chatId,
        senderId: uid,
        content: `Offer: ${price} Ks`,
        type: 'offer',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    // FCM the seller.
    try {
        const userDoc = await db.collection('users').doc(sellerId).get();
        const token = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (token) {
            await messaging.send({
                token,
                notification: { title: 'New offer', body: `${price} Ks on ${product.title}` },
                data: { type: 'offer', productId, offerId: idempotencyKey },
            });
        }
    }
    catch (_) { /* ignore */ }
    return { id: idempotencyKey, chatId };
});
// ============ respondToOffer ============
exports.respondToOffer = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const offerId = requireString(data.offerId, 'offerId');
    const decision = data.decision;
    if (decision !== 'accepted' && decision !== 'rejected' && decision !== 'countered') {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be accepted|rejected|countered');
    }
    const counterPrice = data.counterPrice != null ? requireMoneyInt(data.counterPrice, 'counterPrice') : null;
    if (decision === 'countered' && (counterPrice == null || counterPrice <= 0)) {
        throw new functions.https.HttpsError('invalid-argument', 'counterPrice required for countered');
    }
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    const offerRef = db.collection('offers').doc(offerId);
    const offerSnap = await offerRef.get();
    if (!offerSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Offer not found');
    }
    const offer = offerSnap.data();
    if (offer.sellerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Only the seller can respond');
    }
    if (offer.status !== 'pending' && offer.status !== 'countered') {
        throw new functions.https.HttpsError('failed-precondition', 'Offer is already closed');
    }
    // Idempotency: refuse the same decision twice.
    const idemRef = db.collection('offer_decisions').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
        return { ok: true, alreadyProcessed: true, status: offer.status };
    }
    await db.runTransaction(async (tx) => {
        tx.update(offerRef, Object.assign(Object.assign({ status: decision }, (decision === 'countered' ? { counterPrice, buyerId: offer.buyerId } : {})), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        tx.set(idemRef, {
            id: idempotencyKey,
            offerId,
            actor: uid,
            decision,
            counterPrice: counterPrice !== null && counterPrice !== void 0 ? counterPrice : null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    // FCM the buyer.
    try {
        const userDoc = await db.collection('users').doc(offer.buyerId).get();
        const token = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (token) {
            await messaging.send({
                token,
                notification: { title: 'Offer update', body: `Your offer was ${decision}` },
                data: { type: 'offer', offerId },
            });
        }
    }
    catch (_) { /* ignore */ }
    return { ok: true, alreadyProcessed: false, status: decision };
});
// ============ createReview (one per completed order) ============
exports.createReview = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const uid = requireAuth({ auth: context.auth, data });
    const orderId = requireString(data.orderId, 'orderId');
    const rating = requirePositiveInt(data.rating, 'rating');
    if (rating > 5) {
        throw new functions.https.HttpsError('invalid-argument', 'rating must be 1..5');
    }
    const comment = (_a = optionalString(data.comment, 'comment', 2000)) !== null && _a !== void 0 ? _a : '';
    const imageUrls = data.imageUrls;
    if (imageUrls != null && !Array.isArray(imageUrls)) {
        throw new functions.https.HttpsError('invalid-argument', 'imageUrls must be an array');
    }
    const finalImages = (_b = imageUrls === null || imageUrls === void 0 ? void 0 : imageUrls.filter((u) => typeof u === 'string')) !== null && _b !== void 0 ? _b : [];
    // Idempotency: doc id = `${orderId}_${uid}`.
    const reviewId = `${orderId}_${uid}`;
    const reviewRef = db.collection('reviews').doc(reviewId);
    const existing = await reviewRef.get();
    if (existing.exists) {
        throw new functions.https.HttpsError('already-exists', 'You already reviewed this order');
    }
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found');
    }
    const order = orderSnap.data();
    if (order.customerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Only the buyer can review');
    }
    if (order.status !== 'completed') {
        throw new functions.https.HttpsError('failed-precondition', 'Reviews are allowed only after COMPLETED');
    }
    await db.runTransaction(async (tx) => {
        var _a, _b, _c;
        tx.set(reviewRef, {
            id: reviewId,
            orderId,
            productId: (_b = (_a = order.productId) !== null && _a !== void 0 ? _a : (order.items && order.items[0] && order.items[0].productId)) !== null && _b !== void 0 ? _b : null,
            shopId: order.shopId,
            userId: uid,
            userName: (_c = order.customerName) !== null && _c !== void 0 ? _c : 'Customer',
            rating,
            comment,
            images: finalImages,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Recompute shop rating.
        const reviewsSnap = await tx.get(db.collection('reviews').where('shopId', '==', order.shopId));
        const total = reviewsSnap.size + 1;
        const sum = reviewsSnap.docs.reduce((acc, d) => acc + d.data().rating, 0) + rating;
        const avg = sum / total;
        tx.update(db.collection('shops').doc(order.shopId), {
            rating: avg,
            totalReviews: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { id: reviewId };
});
// ============ createReport ============
exports.createReport = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const targetType = requireString(data.targetType, 'targetType');
    if (targetType !== 'product' && targetType !== 'shop' && targetType !== 'user' && targetType !== 'review') {
        throw new functions.https.HttpsError('invalid-argument', 'invalid targetType');
    }
    const targetId = requireString(data.targetId, 'targetId');
    const reason = requireString(data.reason, 'reason', 80);
    const description = (_a = optionalString(data.description, 'description', 2000)) !== null && _a !== void 0 ? _a : '';
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    // Idempotency: one report per (user, target) per hour to prevent spam.
    const existing = await db.collection('reports')
        .where('reporterId', '==', uid)
        .where('targetId', '==', targetId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();
    if (!existing.empty) {
        throw new functions.https.HttpsError('already-exists', 'You already reported this target');
    }
    const ref = db.collection('reports').doc(idempotencyKey);
    await ref.set({
        id: idempotencyKey,
        reporterId: uid,
        targetType,
        targetId,
        reason,
        description,
        status: 'pending',
        adminNote: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: idempotencyKey };
});
// ============ reviewReport (admin) ============
exports.reviewReport = functions.https.onCall(async (data, context) => {
    var _a, _b;
    const adminUid = requireAuth({ auth: context.auth, data });
    const userDoc = await db.collection('users').doc(adminUid).get();
    if (((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    const reportId = requireString(data.reportId, 'reportId');
    const decision = data.decision;
    if (decision !== 'resolved' && decision !== 'dismissed') {
        throw new functions.https.HttpsError('invalid-argument', 'decision must be resolved|dismissed');
    }
    const note = (_b = optionalString(data.note, 'note', 500)) !== null && _b !== void 0 ? _b : '';
    const ref = db.collection('reports').doc(reportId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Report not found');
    }
    if (snap.data().status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Report already reviewed');
    }
    await ref.update({
        status: decision,
        adminNote: note,
        reviewedBy: adminUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
// ============ createExpense ============
exports.createExpense = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const amount = requireMoneyInt(data.amount, 'amount');
    const category = requireString(data.category, 'category', 80);
    const note = (_a = optionalString(data.note, 'note', 500)) !== null && _a !== void 0 ? _a : '';
    const date = (_b = optionalString(data.date, 'date', 40)) !== null && _b !== void 0 ? _b : new Date().toISOString();
    const idempotencyKey = requireString(data.idempotencyKey, 'idempotencyKey', 80);
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = ((_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.role) === 'admin';
    if (!isAdmin) {
        const shopDoc = await db.collection('shops').doc(shopId).get();
        if (!shopDoc.exists || shopDoc.data().ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
        }
    }
    const idemRef = db.collection('expenses').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
        return { alreadyProcessed: true, id: idempotencyKey };
    }
    const ref = db.collection('expenses').doc(idempotencyKey);
    await ref.set({
        id: idempotencyKey,
        shopId,
        amount,
        category,
        note,
        date,
        userId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { alreadyProcessed: false, id: idempotencyKey };
});
// ============ deleteExpense ============
exports.deleteExpense = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const expenseId = requireString(data.expenseId, 'expenseId');
    const ref = db.collection('expenses').doc(expenseId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Expense not found');
    }
    const expense = snap.data();
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    if (!isAdmin) {
        const shopDoc = await db.collection('shops').doc(expense.shopId).get();
        if (!shopDoc.exists || shopDoc.data().ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
        }
    }
    await ref.delete();
    return { ok: true };
});
// ============ incrementProductViews ============
exports.incrementProductViews = functions.https.onCall(async (data, _context) => {
    const productId = requireString(data.productId, 'productId');
    const productRef = db.collection('products').doc(productId);
    await productRef.update({
        views: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
// ============ toggleShopFollow ============
exports.toggleShopFollow = functions.https.onCall(async (data, context) => {
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const follow = data.follow === true;
    const shopRef = db.collection('shops').doc(shopId);
    const shopSnap = await shopRef.get();
    if (!shopSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Shop not found');
    }
    const followersRef = db.collection('shop_followers').doc();
    const existingQ = db.collection('shop_followers')
        .where('userId', '==', uid)
        .where('shopId', '==', shopId)
        .limit(1);
    const existingSnap = await existingQ.get();
    if (follow) {
        if (!existingSnap.empty) {
            return { ok: true, alreadyFollowing: true };
        }
        await followersRef.set({
            id: followersRef.id,
            userId: uid,
            shopId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await shopRef.update({
            totalFollowers: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, following: true };
    }
    else {
        if (existingSnap.empty) {
            return { ok: true, alreadyNotFollowing: true };
        }
        await existingSnap.docs[0].ref.delete();
        await shopRef.update({
            totalFollowers: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ok: true, following: false };
    }
});
// ============ deleteProduct ============
exports.deleteProduct = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const productId = requireString(data.productId, 'productId');
    const productRef = db.collection('products').doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Product not found');
    }
    const product = productSnap.data();
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = ((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role) === 'admin';
    if (!isAdmin) {
        if (product.sellerId !== uid) {
            const shopDoc = await db.collection('shops').doc(product.shopId).get();
            if (!shopDoc.exists || shopDoc.data().ownerId !== uid) {
                throw new functions.https.HttpsError('permission-denied', 'Not authorized');
            }
        }
    }
    await productRef.delete();
    return { ok: true };
});
//# sourceMappingURL=callables.js.map