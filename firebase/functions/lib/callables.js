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
exports.deleteProduct = exports.toggleShopFollow = exports.incrementProductViews = exports.deleteExpense = exports.createExpense = exports.reviewReport = exports.createReport = exports.createReview = exports.respondToOffer = exports.createOffer = exports.markChatRead = exports.setTyping = exports.sendChatMessage = exports.createChat = exports.adjustStock = exports.updateOrderStatus = exports.createPOSSale = exports.createOrder = exports.decrementStock = exports.saveProduct = exports.reviewVerification = exports.submitVerification = exports.onCreateShop = exports.syncPhoneVerification = void 0;
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
const secureCallable = functions.runWith({
    // Turn this on in staging/production only after every client has a configured provider.
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
}).https.onCall;
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
function requireIdempotencyKey(value) {
    const key = requireString(value, 'idempotencyKey', 100);
    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
        throw new functions.https.HttpsError('invalid-argument', 'idempotencyKey may contain only letters, numbers, hyphens, and underscores');
    }
    return key;
}
function scopedId(uid, key) {
    return `${uid}_${key}`;
}
function requireStringArray(value, field, maxItems = 8) {
    if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) {
        throw new functions.https.HttpsError('invalid-argument', `${field} must contain between 1 and ${maxItems} items`);
    }
    return value.map((item, index) => requireString(item, `${field}[${index}]`, 1000));
}
async function requireOwnedShop(uid, shopId, requireVerified = false) {
    const shopDoc = await db.collection('shops').doc(shopId).get();
    if (!shopDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Shop not found');
    }
    const shop = shopDoc.data();
    if (shop.ownerId !== uid) {
        throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
    }
    if (requireVerified && !(shop.verified === true && shop.verificationStatus === 'approved')) {
        throw new functions.https.HttpsError('failed-precondition', 'Verified shop approval is required');
    }
    return shop;
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
exports.syncPhoneVerification = secureCallable(async (data, context) => {
    const uid = requireAuth({ auth: context.auth, data });
    const authUser = await admin.auth().getUser(uid);
    if (!authUser.phoneNumber) {
        throw new functions.https.HttpsError('failed-precondition', 'No verified phone number is linked to this account');
    }
    await db.collection('users').doc(uid).set({
        uid,
        phoneNumber: authUser.phoneNumber,
        phoneVerified: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { phoneNumber: authUser.phoneNumber, phoneVerified: true };
});
// ============ onCreateShop ============
exports.onCreateShop = secureCallable(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
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
    const coverImage = optionalString(data.coverImage, 'coverImage', 500);
    const socialLinks = {
        facebook: (_d = optionalString((_c = data.socialLinks) === null || _c === void 0 ? void 0 : _c.facebook, 'facebook', 300)) !== null && _d !== void 0 ? _d : '',
        instagram: (_f = optionalString((_e = data.socialLinks) === null || _e === void 0 ? void 0 : _e.instagram, 'instagram', 300)) !== null && _f !== void 0 ? _f : '',
        tiktok: (_h = optionalString((_g = data.socialLinks) === null || _g === void 0 ? void 0 : _g.tiktok, 'tiktok', 300)) !== null && _h !== void 0 ? _h : '',
        website: (_k = optionalString((_j = data.socialLinks) === null || _j === void 0 ? void 0 : _j.website, 'website', 300)) !== null && _k !== void 0 ? _k : '',
    };
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
    const ownerLockRef = db.collection('shop_owners').doc(uid);
    const slugLockRef = db.collection('shop_slugs').doc(slug);
    const shopData = {
        id: shopRef.id,
        ownerId: uid,
        name,
        slug,
        description,
        logo: logo !== null && logo !== void 0 ? logo : null,
        coverImage: coverImage !== null && coverImage !== void 0 ? coverImage : null,
        phone,
        email: email !== null && email !== void 0 ? email : '',
        address,
        city,
        region,
        lat: null,
        lng: null,
        socialLinks,
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
        const [ownerLock, slugLock] = await Promise.all([
            tx.get(ownerLockRef),
            tx.get(slugLockRef),
        ]);
        if (ownerLock.exists) {
            throw new functions.https.HttpsError('already-exists', 'You already have a shop');
        }
        if (slugLock.exists) {
            throw new functions.https.HttpsError('already-exists', 'Slug already in use');
        }
        tx.set(shopRef, shopData);
        tx.set(memberRef, memberData);
        tx.set(ownerLockRef, { shopId: shopRef.id, ownerId: uid });
        tx.set(slugLockRef, { shopId: shopRef.id, slug });
        tx.set(userRef, {
            shopVerified: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
    // Claims are a convenience cache, not part of shop creation correctness.
    // Do not turn a committed shop into a client-visible INTERNAL error if Auth
    // claims propagation is temporarily unavailable.
    try {
        const authUser = await admin.auth().getUser(uid);
        await admin.auth().setCustomUserClaims(uid, Object.assign(Object.assign({}, ((_l = authUser.customClaims) !== null && _l !== void 0 ? _l : {})), { shopId: shopRef.id }));
    }
    catch (error) {
        console.error('onCreateShop: custom claims update failed after commit', {
            uid,
            shopId: shopRef.id,
            error,
        });
    }
    return {
        id: shopRef.id,
        name: shopData.name,
        slug: shopData.slug,
    };
});
// ============ submitVerification ============
exports.submitVerification = secureCallable(async (data, context) => {
    var _a, _b, _c, _d, _e;
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const ownerName = requireString(data.ownerName, 'ownerName', 120);
    const phone = requireString(data.phone, 'phone', 40);
    const email = (_a = optionalString(data.email, 'email', 120)) !== null && _a !== void 0 ? _a : '';
    const address = requireString(data.address, 'address', 240);
    const city = (_b = optionalString(data.city, 'city', 80)) !== null && _b !== void 0 ? _b : '';
    const region = (_c = optionalString(data.region, 'region', 80)) !== null && _c !== void 0 ? _c : '';
    const description = (_d = optionalString(data.description, 'description', 1000)) !== null && _d !== void 0 ? _d : '';
    const facebookPage = (_e = optionalString(data.facebookPage, 'facebookPage', 300)) !== null && _e !== void 0 ? _e : '';
    const shopPhotos = requireStringArray(data.shopPhotos, 'shopPhotos', 8);
    const shopRef = db.collection('shops').doc(shopId);
    const requestRef = db.collection('verification_requests').doc(shopId);
    await db.runTransaction(async (tx) => {
        const [shopSnap, requestSnap] = await Promise.all([
            tx.get(shopRef),
            tx.get(requestRef),
        ]);
        if (!shopSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Shop not found');
        }
        const shop = shopSnap.data();
        if (shop.ownerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
        }
        if (shop.verificationStatus === 'approved') {
            throw new functions.https.HttpsError('failed-precondition', 'Shop is already verified');
        }
        if (requestSnap.exists && requestSnap.data().status === 'pending') {
            throw new functions.https.HttpsError('already-exists', 'A pending request already exists');
        }
        tx.set(requestRef, {
            id: requestRef.id,
            userId: uid,
            shopId,
            shopName: shop.name,
            ownerName,
            phone,
            email,
            address,
            city,
            region,
            description,
            facebookPage,
            shopPhotos,
            status: 'pending',
            adminNote: null,
            reviewedBy: null,
            createdAt: requestSnap.exists
                ? requestSnap.data().createdAt
                : admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(shopRef, {
            verificationStatus: 'pending',
            verified: false,
            businessModeEnabled: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { id: requestRef.id };
});
// ============ reviewVerification (admin) ============
exports.reviewVerification = secureCallable(async (data, context) => {
    var _a, _b, _c;
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
    const ref = db.collection('verification_requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', 'Request not found');
    }
    const request = snap.data();
    if (request.status !== 'pending') {
        throw new functions.https.HttpsError('failed-precondition', 'Request already reviewed');
    }
    const ownerId = await db.runTransaction(async (tx) => {
        const latestRequest = await tx.get(ref);
        if (!latestRequest.exists || latestRequest.data().status !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition', 'Request already reviewed');
        }
        const latestRequestData = latestRequest.data();
        const shopRef = db.collection('shops').doc(latestRequestData.shopId);
        const shopSnap = await tx.get(shopRef);
        if (!shopSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Shop not found');
        }
        const currentOwnerId = shopSnap.data().ownerId;
        tx.update(ref, {
            status: decision,
            adminNote: note,
            reviewedBy: adminUid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        if (decision === 'approved') {
            tx.update(shopRef, {
                verified: true,
                verificationStatus: 'approved',
                businessModeEnabled: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.update(db.collection('users').doc(currentOwnerId), {
                shopVerified: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            tx.update(shopRef, {
                verified: false,
                verificationStatus: 'rejected',
                businessModeEnabled: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.update(db.collection('users').doc(currentOwnerId), {
                shopVerified: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return currentOwnerId;
    });
    const authUser = await admin.auth().getUser(ownerId);
    await admin.auth().setCustomUserClaims(ownerId, Object.assign(Object.assign({}, ((_c = authUser.customClaims) !== null && _c !== void 0 ? _c : {})), { shopVerified: decision === 'approved' }));
    return { ok: true };
});
// ============ saveProduct (create/update) ============
exports.saveProduct = secureCallable(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    const uid = requireAuth({ auth: context.auth, data });
    const productId = optionalString(data.productId, 'productId', 120);
    const requestedShopId = (_a = optionalString(data.shopId, 'shopId', 120)) !== null && _a !== void 0 ? _a : '';
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
    const title = requireString(data.title, 'title', 160);
    const description = (_b = optionalString(data.description, 'description', 3000)) !== null && _b !== void 0 ? _b : '';
    const brand = (_c = optionalString(data.brand, 'brand', 120)) !== null && _c !== void 0 ? _c : '';
    const sellerCity = (_d = optionalString(data.sellerCity, 'sellerCity', 80)) !== null && _d !== void 0 ? _d : '';
    const categoryId = requireString(data.categoryId, 'categoryId', 120);
    const price = requireMoneyInt(data.price, 'price');
    if (price <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'price must be greater than zero');
    }
    const comparePrice = data.comparePrice == null
        ? null
        : requireMoneyInt(data.comparePrice, 'comparePrice');
    const costPrice = data.costPrice == null
        ? null
        : requireMoneyInt(data.costPrice, 'costPrice');
    const stock = requireMoneyInt(data.stock, 'stock');
    const weight = data.weight == null ? null : requireMoneyInt(data.weight, 'weight');
    const sku = (_e = optionalString(data.sku, 'sku', 120)) !== null && _e !== void 0 ? _e : null;
    const condition = requireString(data.condition, 'condition', 20);
    if (!['new', 'used', 'refurbished'].includes(condition)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid product condition');
    }
    if (data.images != null && (!Array.isArray(data.images) || data.images.length > 8)) {
        throw new functions.https.HttpsError('invalid-argument', 'images must be an array with at most 8 items');
    }
    const images = ((_f = data.images) !== null && _f !== void 0 ? _f : []).map((item, index) => requireString(item, `images[${index}]`, 1000));
    const operationRef = db.collection('product_operations').doc(scopedId(uid, idempotencyKey));
    const productRef = productId
        ? db.collection('products').doc(productId)
        : db.collection('products').doc();
    return db.runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e, _f;
        const operationSnap = await tx.get(operationRef);
        if (operationSnap.exists)
            return operationSnap.data();
        const existingSnap = productId ? await tx.get(productRef) : null;
        if (productId && !(existingSnap === null || existingSnap === void 0 ? void 0 : existingSnap.exists)) {
            throw new functions.https.HttpsError('not-found', 'Product not found');
        }
        const existing = existingSnap === null || existingSnap === void 0 ? void 0 : existingSnap.data();
        if (existing && existing.sellerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Not the product owner');
        }
        const currentShopId = (_a = existing === null || existing === void 0 ? void 0 : existing.shopId) !== null && _a !== void 0 ? _a : '';
        if (existing && currentShopId !== requestedShopId) {
            throw new functions.https.HttpsError('failed-precondition', 'A product cannot be moved between seller accounts');
        }
        let sellerName = 'Individual Seller';
        let sellerPhone = '';
        let verifiedPhone = false;
        if (requestedShopId) {
            const shopRef = db.collection('shops').doc(requestedShopId);
            const shopSnap = await tx.get(shopRef);
            if (!shopSnap.exists) {
                throw new functions.https.HttpsError('not-found', 'Shop not found');
            }
            const shop = shopSnap.data();
            if (shop.ownerId !== uid) {
                throw new functions.https.HttpsError('permission-denied', 'Not the shop owner');
            }
            if (!(shop.verified === true && shop.verificationStatus === 'approved')) {
                throw new functions.https.HttpsError('failed-precondition', 'Verified shop approval is required');
            }
            sellerName = shop.name;
            sellerPhone = (_b = shop.phone) !== null && _b !== void 0 ? _b : '';
            verifiedPhone = true;
        }
        else {
            const userSnap = await tx.get(db.collection('users').doc(uid));
            const user = userSnap.data();
            if (!userSnap.exists || (user === null || user === void 0 ? void 0 : user.phoneVerified) !== true) {
                throw new functions.https.HttpsError('failed-precondition', 'Phone verification is required for individual listings');
            }
            sellerName = (user === null || user === void 0 ? void 0 : user.displayName) || 'Individual Seller';
            sellerPhone = (user === null || user === void 0 ? void 0 : user.phoneNumber) || '';
            verifiedPhone = true;
        }
        const productData = Object.assign({ shopId: requestedShopId, sellerId: uid, sellerType: requestedShopId ? 'shop' : 'individual', sellerName,
            sellerPhone,
            sellerCity, sellerPhoneVerified: verifiedPhone, brand,
            title,
            description,
            price,
            comparePrice,
            costPrice,
            categoryId,
            condition,
            stock,
            sku,
            weight,
            images, status: (_c = existing === null || existing === void 0 ? void 0 : existing.status) !== null && _c !== void 0 ? _c : 'active', views: (_d = existing === null || existing === void 0 ? void 0 : existing.views) !== null && _d !== void 0 ? _d : 0, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, (existing ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        tx.set(productRef, productData, { merge: Boolean(existing) });
        if (requestedShopId && (!existing || existing.stock !== stock)) {
            const movementRef = db.collection('inventory_movements').doc(`product_${operationRef.id}`);
            tx.set(movementRef, {
                id: movementRef.id,
                productId: productRef.id,
                shopId: requestedShopId,
                type: existing ? 'adjustment' : 'initial',
                quantity: existing ? stock - ((_e = existing.stock) !== null && _e !== void 0 ? _e : 0) : stock,
                previousStock: (_f = existing === null || existing === void 0 ? void 0 : existing.stock) !== null && _f !== void 0 ? _f : 0,
                newStock: stock,
                reason: existing ? 'product_edit' : 'product_create',
                userId: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        const result = { id: productRef.id, created: !existing };
        tx.set(operationRef, Object.assign(Object.assign({}, result), { userId: uid, createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        return result;
    });
});
// ============ decrementStock (atomic) ============
exports.decrementStock = secureCallable(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const productId = requireString(data.productId, 'productId');
    const qty = requirePositiveInt(data.quantity, 'quantity');
    const shopId = requireString(data.shopId, 'shopId');
    const reason = (_a = optionalString(data.reason, 'reason', 40)) !== null && _a !== void 0 ? _a : 'order';
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
    await requireOwnedShop(uid, shopId, true);
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
        // Idempotency keys are scoped to the authenticated actor.
        const idemRef = db.collection('inventory_movements').doc(scopedId(uid, idempotencyKey));
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
            userId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { alreadyProcessed: false, newStock };
    });
    return result;
});
exports.createOrder = secureCallable(async (data, context) => {
    var _a, _b, _c;
    const uid = requireAuth({ auth: context.auth, data });
    const items = data.items;
    const address = data.address;
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
    const orderId = scopedId(uid, idempotencyKey);
    if (!Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'items required');
    }
    if (!address || typeof address !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'address required');
    }
    // Check idempotency first.
    const idemRef = db.collection('orders').doc(orderId);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
        return idemSnap.data();
    }
    const result = await db.runTransaction(async (tx) => {
        var _a, _b, _c;
        const existingOrder = await tx.get(idemRef);
        if (existingOrder.exists)
            return existingOrder.data();
        // Group by shop. V1: all items must be from the same shop.
        const productRefs = items.map((i) => db.collection('products').doc(i.productId));
        const productSnaps = await tx.getAll(...productRefs);
        if (productSnaps.some((s) => !s.exists)) {
            throw new functions.https.HttpsError('not-found', 'One or more products not found');
        }
        const products = productSnaps.map((s) => (Object.assign(Object.assign({}, s.data()), { id: s.id })));
        const shopId = (_a = products[0].shopId) !== null && _a !== void 0 ? _a : '';
        let sellerId = products[0].sellerId;
        if (!sellerId && shopId) {
            const shopSnap = await tx.get(db.collection('shops').doc(shopId));
            sellerId = (_b = shopSnap.data()) === null || _b === void 0 ? void 0 : _b.ownerId;
        }
        if (!sellerId || !products.every((p) => { var _a, _b; return ((_a = p.shopId) !== null && _a !== void 0 ? _a : '') === shopId && ((_b = p.sellerId) !== null && _b !== void 0 ? _b : sellerId) === sellerId; })) {
            throw new functions.https.HttpsError('invalid-argument', 'All items must be from one seller');
        }
        if (sellerId === uid) {
            throw new functions.https.HttpsError('failed-precondition', 'You cannot order your own listing');
        }
        // Validate stock + snapshot price/cost server-side.
        const lineItems = products.map((p, idx) => {
            var _a, _b, _c, _d;
            const requested = items[idx].quantity;
            if (!Number.isInteger(requested) || requested < 1) {
                throw new functions.https.HttpsError('invalid-argument', 'Each item quantity must be a positive integer');
            }
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
        // V1 is COD-only; promotions and delivery pricing are not client-authoritative.
        const deliveryFee = 0;
        const discount = 0;
        if (data.paymentMethod != null && data.paymentMethod !== 'cod') {
            throw new functions.https.HttpsError('invalid-argument', 'V1 marketplace orders support COD only');
        }
        const total = subtotal + deliveryFee - discount;
        if (total < 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Total cannot be negative');
        }
        const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)
            .toString().padStart(3, '0')}`;
        const order = {
            id: orderId,
            orderNumber,
            buyerId: uid,
            sellerId,
            shopId,
            items: lineItems,
            shippingAddress: address,
            subtotal,
            deliveryFee,
            discount,
            total,
            status: 'pending',
            paymentMethod: 'cod',
            paymentStatus: 'pending',
            note: (_c = optionalString(data.note, 'note', 500)) !== null && _c !== void 0 ? _c : '',
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
            const mvmtRef = db.collection('inventory_movements').doc(`${orderId}-${l.productId}`);
            tx.set(mvmtRef, {
                id: mvmtRef.id,
                productId: l.productId,
                shopId,
                type: 'sale',
                quantity: -l.quantity,
                newStock: admin.firestore.FieldValue.increment(-l.quantity),
                reason: `order:${orderId}`,
                userId: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        return order;
    });
    // After commit, send FCM to the seller.
    try {
        let recipientId = result.sellerId;
        if (result.shopId) {
            const shopDoc = await db.collection('shops').doc(result.shopId).get();
            recipientId = (_b = (_a = shopDoc.data()) === null || _a === void 0 ? void 0 : _a.ownerId) !== null && _b !== void 0 ? _b : recipientId;
        }
        if (recipientId) {
            const userDoc = await db.collection('users').doc(recipientId).get();
            const token = (_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.fcmToken;
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
    return {
        id: result.id,
        orderNumber: result.orderNumber,
        total: result.total,
        sellerId: result.sellerId,
        shopId: result.shopId,
    };
});
// ============ createPOSSale ============
exports.createPOSSale = secureCallable(async (data, context) => {
    var _a;
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const items = data.items;
    if (!Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'items required');
    }
    await requireOwnedShop(uid, shopId, true);
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
    const saleId = scopedId(uid, idempotencyKey);
    const paymentMethod = requireString((_a = data.paymentMethod) !== null && _a !== void 0 ? _a : 'cash', 'paymentMethod', 40);
    if (!['cash', 'kbzpay', 'wavepay', 'bank_transfer', 'other'].includes(paymentMethod)) {
        throw new functions.https.HttpsError('invalid-argument', 'Unsupported payment method');
    }
    // Idempotency: a receipt with the same id should be returned.
    const idemRef = db.collection('pos_sales').doc(saleId);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists)
        return idemSnap.data();
    const result = await db.runTransaction(async (tx) => {
        var _a, _b, _c, _d;
        const existingSale = await tx.get(idemRef);
        if (existingSale.exists)
            return existingSale.data();
        const productRefs = items.map((i) => db.collection('products').doc(i.productId));
        const productSnaps = await tx.getAll(...productRefs);
        if (productSnaps.some((s) => !s.exists)) {
            throw new functions.https.HttpsError('not-found', 'Product not found');
        }
        const products = productSnaps.map((s) => (Object.assign(Object.assign({}, s.data()), { id: s.id })));
        if (!products.every((p) => p.shopId === shopId)) {
            throw new functions.https.HttpsError('invalid-argument', 'Items must be from this shop');
        }
        if (!products.every((p) => !p.status || p.status === 'active')) {
            throw new functions.https.HttpsError('failed-precondition', 'Inactive products cannot be sold');
        }
        const lineItems = products.map((p, idx) => {
            var _a, _b, _c, _d;
            const q = items[idx].quantity;
            if (!Number.isInteger(q) || q < 1) {
                throw new functions.https.HttpsError('invalid-argument', 'Each item quantity must be a positive integer');
            }
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
        const costOfGoodsSold = lineItems.reduce((s, l) => s + l.costPrice * l.quantity, 0);
        const discount = requireMoneyInt((_a = data.discount) !== null && _a !== void 0 ? _a : 0, 'discount');
        const tax = requireMoneyInt((_b = data.tax) !== null && _b !== void 0 ? _b : 0, 'tax');
        const total = subtotal - discount + tax;
        if (total < 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Total cannot be negative');
        }
        const sale = {
            id: saleId,
            clientRequestId: idempotencyKey,
            shopId,
            cashierId: uid,
            items: lineItems,
            subtotal,
            discount,
            tax,
            total,
            costOfGoodsSold,
            grossProfit: subtotal - discount - costOfGoodsSold,
            paymentMethod,
            customerPhone: (_c = optionalString(data.customerPhone, 'customerPhone', 40)) !== null && _c !== void 0 ? _c : '',
            note: (_d = optionalString(data.note, 'note', 500)) !== null && _d !== void 0 ? _d : '',
            createdAtMs: Date.now(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(idemRef, sale);
        lineItems.forEach((l) => {
            tx.update(db.collection('products').doc(l.productId), {
                stock: admin.firestore.FieldValue.increment(-l.quantity),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            const mvmtRef = db.collection('inventory_movements').doc(`pos-${saleId}-${l.productId}`);
            tx.set(mvmtRef, {
                id: mvmtRef.id,
                productId: l.productId,
                shopId,
                type: 'pos',
                quantity: -l.quantity,
                newStock: admin.firestore.FieldValue.increment(-l.quantity),
                reason: `pos:${saleId}`,
                userId: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        return sale;
    });
    return result;
});
// ============ updateOrderStatus ============
exports.updateOrderStatus = secureCallable(async (data, context) => {
    var _a, _b, _c, _d, _e;
    const uid = requireAuth({ auth: context.auth, data });
    const orderId = requireString(data.orderId, 'orderId');
    const to = requireString(data.status, 'status');
    if (!(to in ORDER_TRANSITIONS)) {
        throw new functions.https.HttpsError('invalid-argument', 'unknown status');
    }
    const note = (_a = optionalString(data.note, 'note', 500)) !== null && _a !== void 0 ? _a : '';
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
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
            else if (order.sellerId === uid) {
                allowed = true;
            }
            else if (order.shopId) {
                const shopDoc = await tx.get(db.collection('shops').doc(order.shopId));
                allowed = shopDoc.exists && shopDoc.data().ownerId === uid;
            }
        }
        if (!allowed) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }
        const idemRef = db.collection('order_status_history').doc(scopedId(uid, idempotencyKey));
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
        const buyerId = (_c = (_b = orderDoc.data()) === null || _b === void 0 ? void 0 : _b.buyerId) !== null && _c !== void 0 ? _c : (_d = orderDoc.data()) === null || _d === void 0 ? void 0 : _d.customerId;
        if (buyerId) {
            const userDoc = await db.collection('users').doc(buyerId).get();
            const token = (_e = userDoc.data()) === null || _e === void 0 ? void 0 : _e.fcmToken;
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
exports.adjustStock = secureCallable(async (data, context) => {
    var _a, _b;
    const uid = requireAuth({ auth: context.auth, data });
    const productId = requireString(data.productId, 'productId');
    const shopId = requireString(data.shopId, 'shopId');
    const type = data.type;
    const qty = requirePositiveInt(data.quantity, 'quantity');
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
    const reason = (_a = optionalString(data.reason, 'reason', 80)) !== null && _a !== void 0 ? _a : 'manual';
    if (type !== 'increment' && type !== 'decrement' && type !== 'set') {
        throw new functions.https.HttpsError('invalid-argument', 'type must be increment|decrement|set');
    }
    // Authorize: shop owner or admin.
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.role) === 'admin';
    if (!isAdmin) {
        await requireOwnedShop(uid, shopId, true);
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
        const idemRef = db.collection('inventory_movements').doc(scopedId(uid, idempotencyKey));
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
// ============ createChat ============
exports.createChat = secureCallable(async (data, context) => {
    var _a, _b, _c, _d, _e;
    const uid = requireAuth({ auth: context.auth, data });
    const orderId = optionalString(data.orderId, 'orderId', 120);
    const productId = optionalString(data.productId, 'productId', 120);
    const shopId = optionalString(data.shopId, 'shopId', 120);
    if (!orderId && !productId && !shopId) {
        throw new functions.https.HttpsError('invalid-argument', 'orderId, productId, or shopId is required');
    }
    let sellerId = '';
    let resolvedProductId = productId !== null && productId !== void 0 ? productId : null;
    let resolvedShopId = shopId !== null && shopId !== void 0 ? shopId : null;
    if (orderId) {
        const orderSnap = await db.collection('orders').doc(orderId).get();
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Order not found');
        }
        const order = orderSnap.data();
        const buyerId = (_a = order.buyerId) !== null && _a !== void 0 ? _a : order.customerId;
        if (buyerId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only the buyer can contact this seller');
        }
        resolvedShopId = order.shopId || null;
        resolvedProductId = (_d = (_c = (_b = order.items) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.productId) !== null && _d !== void 0 ? _d : null;
        sellerId = (_e = order.sellerId) !== null && _e !== void 0 ? _e : '';
    }
    if (resolvedShopId) {
        const shopSnap = await db.collection('shops').doc(resolvedShopId).get();
        if (!shopSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Shop not found');
        }
        sellerId = shopSnap.data().ownerId;
    }
    else if (resolvedProductId) {
        const productSnap = await db.collection('products').doc(resolvedProductId).get();
        if (!productSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Product not found');
        }
        sellerId = productSnap.data().sellerId;
    }
    if (!sellerId) {
        throw new functions.https.HttpsError('failed-precondition', 'Seller could not be resolved');
    }
    if (sellerId === uid) {
        throw new functions.https.HttpsError('failed-precondition', 'You cannot start a chat with yourself');
    }
    const participants = [uid, sellerId].sort();
    const chatId = participants.join('_');
    const chatRef = db.collection('chats').doc(chatId);
    const existingChat = await chatRef.get();
    await chatRef.set(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ id: chatId, participants }, (resolvedProductId ? { productId: resolvedProductId } : {})), (resolvedShopId ? { shopId: resolvedShopId } : {})), (orderId ? { orderId } : {})), { updatedAt: admin.firestore.FieldValue.serverTimestamp() }), (!existingChat.exists ? { createdAt: admin.firestore.FieldValue.serverTimestamp() } : {})), { merge: true });
    return { id: chatId };
});
// ============ sendChatMessage ============
exports.sendChatMessage = secureCallable(async (data, context) => {
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
exports.setTyping = secureCallable(async (data, context) => {
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
exports.markChatRead = secureCallable(async (data, context) => {
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
exports.createOffer = secureCallable(async (data, context) => {
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
exports.respondToOffer = secureCallable(async (data, context) => {
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
exports.createReview = secureCallable(async (data, context) => {
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
exports.createReport = secureCallable(async (data, context) => {
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
exports.reviewReport = secureCallable(async (data, context) => {
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
exports.createExpense = secureCallable(async (data, context) => {
    var _a, _b, _c;
    const uid = requireAuth({ auth: context.auth, data });
    const shopId = requireString(data.shopId, 'shopId');
    const amount = requireMoneyInt(data.amount, 'amount');
    const category = requireString(data.category, 'category', 80);
    const note = (_a = optionalString(data.note, 'note', 500)) !== null && _a !== void 0 ? _a : '';
    const date = (_b = optionalString(data.date, 'date', 40)) !== null && _b !== void 0 ? _b : new Date().toISOString();
    const idempotencyKey = requireIdempotencyKey(data.idempotencyKey);
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = ((_c = userDoc.data()) === null || _c === void 0 ? void 0 : _c.role) === 'admin';
    if (!isAdmin) {
        await requireOwnedShop(uid, shopId, true);
    }
    const expenseId = scopedId(uid, idempotencyKey);
    const idemRef = db.collection('expenses').doc(expenseId);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
        return { alreadyProcessed: true, id: expenseId };
    }
    const ref = db.collection('expenses').doc(expenseId);
    await ref.set({
        id: expenseId,
        shopId,
        amount,
        category,
        note,
        description: note,
        date,
        userId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { alreadyProcessed: false, id: expenseId };
});
// ============ deleteExpense ============
exports.deleteExpense = secureCallable(async (data, context) => {
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
exports.incrementProductViews = secureCallable(async (data, _context) => {
    const productId = requireString(data.productId, 'productId');
    const productRef = db.collection('products').doc(productId);
    await productRef.update({
        views: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true };
});
// ============ toggleShopFollow ============
exports.toggleShopFollow = secureCallable(async (data, context) => {
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
exports.deleteProduct = secureCallable(async (data, context) => {
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