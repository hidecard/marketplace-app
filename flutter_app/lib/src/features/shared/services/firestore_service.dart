import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import '../models/models.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ============== Products ==============
  Stream<List<Product>> productsStream({int? limit}) {
    var q = _db.collection('products').where('status', isEqualTo: 'active');
    if (limit != null) q = q.limit(limit);
    return q.snapshots().map(
          (s) => s.docs.map((d) => Product.fromMap(d.data(), d.id)).toList(),
        );
  }

  Stream<List<Product>> allProductsStream() {
    return _db.collection('products').snapshots().map(
          (s) => s.docs.map((d) => Product.fromMap(d.data(), d.id)).toList(),
        );
  }

  Stream<List<Product>> productsByShopStream(String shopId) {
    return _db
        .collection('products')
        .where('shopId', isEqualTo: shopId)
        .snapshots()
        .map((s) => s.docs.map((d) => Product.fromMap(d.data(), d.id)).toList());
  }

  Stream<List<Product>> productsByCategoryStream(String categoryId) {
    return _db
        .collection('products')
        .where('categoryId', isEqualTo: categoryId)
        .where('status', isEqualTo: 'active')
        .snapshots()
        .map((s) => s.docs.map((d) => Product.fromMap(d.data(), d.id)).toList());
  }

  Future<Product?> getProduct(String id) async {
    final doc = await _db.collection('products').doc(id).get();
    if (!doc.exists) return null;
    return Product.fromMap(doc.data()!, doc.id);
  }

  Future<void> createProduct(Product p) async {
    await _db.collection('products').doc(p.id).set(p.toMap());
  }

  Future<void> updateProduct(Product p) async {
    await _db.collection('products').doc(p.id).update(p.toMap());
  }

  Future<void> deleteProduct(String id) async {
    await _db.collection('products').doc(id).delete();
  }

  // ============== Categories ==============
  Stream<List<Category>> categoriesStream() {
    return _db
        .collection('categories')
        .orderBy('order')
        .snapshots()
        .map((s) => s.docs.map((d) => Category.fromMap(d.data(), d.id)).toList());
  }

  Future<Category?> getCategory(String id) async {
    final doc = await _db.collection('categories').doc(id).get();
    if (!doc.exists) return null;
    return Category.fromMap(doc.data()!, doc.id);
  }

  Future<void> createCategory(Category c) async {
    await _db.collection('categories').doc(c.id).set(c.toMap());
  }

  Future<void> updateCategory(Category c) async {
    await _db.collection('categories').doc(c.id).update(c.toMap());
  }

  Future<void> deleteCategory(String id) async {
    await _db.collection('categories').doc(id).delete();
  }

  // ============== Shops ==============
  Stream<List<Shop>> shopsStream({bool verifiedOnly = true}) {
    var q = _db.collection('shops') as Query<Map<String, dynamic>>;
    if (verifiedOnly) q = q.where('verified', isEqualTo: true);
    return q.snapshots().map(
          (s) => s.docs.map((d) => Shop.fromMap(d.data(), d.id)).toList(),
        );
  }

  Stream<Shop?> shopStream(String id) {
    return _db
        .collection('shops')
        .doc(id)
        .snapshots()
        .map((d) => d.exists ? Shop.fromMap(d.data()!, d.id) : null);
  }

  Future<Shop?> getShop(String id) async {
    final doc = await _db.collection('shops').doc(id).get();
    if (!doc.exists) return null;
    return Shop.fromMap(doc.data()!, doc.id);
  }

  Future<Shop?> getShopByOwner(String ownerId) async {
    final q = await _db
        .collection('shops')
        .where('ownerId', isEqualTo: ownerId)
        .limit(1)
        .get();
    if (q.docs.isEmpty) return null;
    return Shop.fromMap(q.docs.first.data(), q.docs.first.id);
  }

  Future<void> createShop(Shop s) async {
    await _db.collection('shops').doc(s.id).set(s.toMap());
  }

  Future<void> updateShop(Shop s) async {
    await _db.collection('shops').doc(s.id).update(s.toMap());
  }

  Future<void> deleteShop(String id) async {
    await _db.collection('shops').doc(id).delete();
  }

  Future<void> updateShopVerified(String id, bool verified) async {
    await _db.collection('shops').doc(id).update({'verified': verified});
  }

  // ============== Users ==============
  Future<AppUser?> getUser(String uid) async {
    final doc = await _db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return AppUser.fromMap(doc.data()!, uid);
  }

  Stream<AppUser?> userStream(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .snapshots()
        .map((d) => d.exists ? AppUser.fromMap(d.data()!, uid) : null);
  }

  Future<void> createUser(AppUser u) async {
    await _db.collection('users').doc(u.uid).set(u.toMap());
  }

  Future<void> updateUser(AppUser u) async {
    await _db.collection('users').doc(u.uid).update(u.toMap());
  }

  Stream<List<AppUser>> allUsersStream() {
    return _db
        .collection('users')
        .snapshots()
        .map((s) => s.docs.map((d) => AppUser.fromMap(d.data(), d.id)).toList());
  }

  Future<void> updateUserStatus(String uid, UserStatus status) async {
    await _db.collection('users').doc(uid).update({'status': userStatusToString(status)});
  }

  Future<void> updateUserRole(String uid, UserRole role) async {
    await _db.collection('users').doc(uid).update({'role': userRoleToString(role)});
  }

  // ============== Orders ==============
  Stream<List<Order>> ordersByBuyerStream(String buyerId) {
    return _db
        .collection('orders')
        .where('buyerId', isEqualTo: buyerId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Order.fromMap(d.data(), d.id)).toList());
  }

  Stream<List<Order>> ordersByShopStream(String shopId) {
    return _db
        .collection('orders')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Order.fromMap(d.data(), d.id)).toList());
  }

  Stream<List<Order>> allOrdersStream() {
    return _db
        .collection('orders')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Order.fromMap(d.data(), d.id)).toList());
  }

  Future<Order?> getOrder(String id) async {
    final doc = await _db.collection('orders').doc(id).get();
    if (!doc.exists) return null;
    return Order.fromMap(doc.data()!, doc.id);
  }

  Future<void> createOrder(Order o) async {
    await _db.collection('orders').doc(o.id).set(o.toMap());
  }

  Future<void> updateOrder(Order o) async {
    await _db.collection('orders').doc(o.id).update(o.toMap());
  }

  Future<void> updateOrderStatus(String id, OrderStatus status) async {
    await _db.collection('orders').doc(id).update({
      'status': Order.statusToString(status),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // ============== Cart ==============
  Stream<List<CartItem>> cartStream(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('cart')
        .snapshots()
        .map((s) => s.docs.map((d) => CartItem.fromMap(d.data())).toList());
  }

  Future<void> addToCart(String userId, CartItem item) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('cart')
        .doc(item.productId)
        .set(item.toMap());
  }

  Future<void> removeFromCart(String userId, String productId) async {
    await _db.collection('users').doc(userId).collection('cart').doc(productId).delete();
  }

  Future<void> clearCart(String userId) async {
    final batch = _db.batch();
    final ref = _db.collection('users').doc(userId).collection('cart');
    final snap = await ref.get();
    for (final doc in snap.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  // ============== Addresses ==============
  Stream<List<Address>> addressesStream(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('addresses')
        .orderBy('isDefault', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Address.fromMap(d.data(), d.id)).toList());
  }

  Future<void> addAddress(String userId, Address a) async {
    await _db.collection('users').doc(userId).collection('addresses').doc(a.id).set(a.toMap());
  }

  Future<void> deleteAddress(String userId, String addressId) async {
    await _db.collection('users').doc(userId).collection('addresses').doc(addressId).delete();
  }

  // ============== Favorites ==============
  Stream<List<String>> favoriteIdsStream(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('favorites')
        .snapshots()
        .map((s) => s.docs.map((d) => d.id).toList());
  }

  Future<void> addFavorite(String userId, String productId) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('favorites')
        .doc(productId)
        .set({'createdAt': FieldValue.serverTimestamp()});
  }

  Future<void> removeFavorite(String userId, String productId) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('favorites')
        .doc(productId)
        .delete();
  }

  // ============== Chats ==============
  Stream<List<Chat>> chatsStream(String userId) {
    return _db
        .collection('chats')
        .where('participants', arrayContains: userId)
        .orderBy('lastMessageAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Chat.fromMap(d.data(), d.id)).toList());
  }

  Stream<Chat?> chatStream(String chatId) {
    return _db
        .collection('chats')
        .doc(chatId)
        .snapshots()
        .map((d) => d.exists ? Chat.fromMap(d.data()!, chatId) : null);
  }

  Stream<List<ChatMessage>> messagesStream(String chatId) {
    return _db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((s) => s.docs.map((d) => ChatMessage.fromMap(d.data(), d.id)).toList());
  }

  Future<String> createOrGetChat(List<String> participants, {String? productId}) async {
    final sorted = [...participants]..sort();
    final id = sorted.join('_');
    final ref = _db.collection('chats').doc(id);
    final doc = await ref.get();
    if (!doc.exists) {
      await ref.set(Chat(
        id: id,
        participants: participants,
        productId: productId,
      ).toMap());
    }
    return id;
  }

  Future<void> sendMessage({
    required String chatId,
    required String senderId,
    required String content,
    MessageType type = MessageType.text,
  }) async {
    final msgRef = _db.collection('chats').doc(chatId).collection('messages').doc();
    await msgRef.set(ChatMessage(
      id: msgRef.id,
      chatId: chatId,
      senderId: senderId,
      content: content,
      type: type,
      read: false,
    ).toMap());
    await _db.collection('chats').doc(chatId).update({
      'lastMessage': content,
      'lastMessageAt': FieldValue.serverTimestamp(),
      'lastMessageBy': senderId,
    });
  }

  // ============== Offers ==============
  Future<void> createOffer(Offer o) async {
    await _db.collection('offers').doc(o.id).set(o.toMap());
  }

  Stream<List<Offer>> offersByUserStream(String userId) {
    return _db
        .collection('offers')
        .where('buyerId', isEqualTo: userId)
        .snapshots()
        .map((s) => s.docs.map((d) => Offer.fromMap(d.data(), d.id)).toList());
  }

  Future<void> updateOfferStatus(String id, OfferStatus status) async {
    await _db.collection('offers').doc(id).update({
      'status': Offer.statusToString(status),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // ============== Reviews ==============
  Stream<List<Review>> reviewsByProductStream(String productId) {
    return _db
        .collection('reviews')
        .where('productId', isEqualTo: productId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Review.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createReview(Review r) async {
    await _db.collection('reviews').doc(r.id).set(r.toMap());
  }

  // ============== Expenses ==============
  Stream<List<Expense>> expensesStream(String shopId) {
    return _db
        .collection('expenses')
        .where('shopId', isEqualTo: shopId)
        .orderBy('date', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Expense.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createExpense(Expense e) async {
    await _db.collection('expenses').doc(e.id).set(e.toMap());
  }

  Future<void> deleteExpense(String id) async {
    await _db.collection('expenses').doc(id).delete();
  }

  // ============== Inventory Movements ==============
  Stream<List<InventoryMovement>> inventoryMovementsStream(String shopId) {
    return _db
        .collection('inventoryMovements')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => InventoryMovement.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createInventoryMovement(InventoryMovement m) async {
    await _db.collection('inventoryMovements').doc(m.id).set(m.toMap());
  }

  Future<void> updateProductStock(String productId, int newStock) async {
    await _db.collection('products').doc(productId).update({'stock': newStock});
  }

  // ============== POS Sales ==============
  Stream<List<POSSale>> posSalesStream(String shopId) {
    return _db
        .collection('posSales')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => POSSale.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createPOSSale(POSSale s) async {
    await _db.collection('posSales').doc(s.id).set(s.toMap());
  }

  // ============== Customers ==============
  Stream<List<AppUser>> customersStream(String shopId) {
    return _db
        .collection('orders')
        .where('shopId', isEqualTo: shopId)
        .snapshots()
        .asyncMap((s) async {
      final buyerIds = s.docs.map((d) => d.data()['buyerId'] as String).toSet().toList();
      if (buyerIds.isEmpty) return <AppUser>[];
      final users = await _db
          .collection('users')
          .where(FieldPath.documentId, whereIn: buyerIds)
          .get();
      return users.docs.map((d) => AppUser.fromMap(d.data(), d.id)).toList();
    });
  }

  // ============== Verifications ==============
  Stream<List<VerificationRequest>> verificationsStream() {
    return _db
        .collection('verificationRequests')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => VerificationRequest.fromMap(d.data(), d.id)).toList());
  }

  Stream<VerificationRequest?> myVerificationStream(String userId) {
    return _db
        .collection('verificationRequests')
        .where('userId', isEqualTo: userId)
        .limit(1)
        .snapshots()
        .map((s) => s.docs.isEmpty
            ? null
            : VerificationRequest.fromMap(s.docs.first.data(), s.docs.first.id));
  }

  Future<void> createVerificationRequest(VerificationRequest r) async {
    await _db.collection('verificationRequests').doc(r.id).set(r.toMap());
  }

  Future<void> updateVerificationStatus(
      String id, VerificationRequestStatus status, String? adminNote) async {
    await _db.collection('verificationRequests').doc(id).update({
      'status': VerificationRequest.statusToString(status),
      'adminNote': adminNote,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // ============== Reports ==============
  Stream<List<Report>> reportsStream() {
    return _db
        .collection('reports')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => Report.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createReport(Report r) async {
    await _db.collection('reports').doc(r.id).set(r.toMap());
  }

  Future<void> updateReportStatus(String id, ReportStatus status, String? adminNote) async {
    await _db.collection('reports').doc(id).update({
      'status': Report.statusToString(status),
      'adminNote': adminNote,
    });
  }

  // ============== Banners ==============
  Stream<List<AppBanner>> bannersStream() {
    return _db
        .collection('banners')
        .where('active', isEqualTo: true)
        .orderBy('order')
        .snapshots()
        .map((s) => s.docs.map((d) => AppBanner.fromMap(d.data(), d.id)).toList());
  }

  Stream<List<AppBanner>> allBannersStream() {
    return _db
        .collection('banners')
        .orderBy('order')
        .snapshots()
        .map((s) => s.docs.map((d) => AppBanner.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createBanner(AppBanner b) async {
    await _db.collection('banners').doc(b.id).set(b.toMap());
  }

  Future<void> deleteBanner(String id) async {
    await _db.collection('banners').doc(id).delete();
  }

  Future<void> updateBanner(AppBanner b) async {
    await _db.collection('banners').doc(b.id).update(b.toMap());
  }

  // ============== Notifications ==============
  Stream<List<AppNotification>> notificationsStream(String userId) {
    return _db
        .collection('notifications')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((s) => s.docs.map((d) => AppNotification.fromMap(d.data(), d.id)).toList());
  }

  Future<void> createNotification(AppNotification n) async {
    await _db.collection('notifications').doc(n.id).set(n.toMap());
  }

  Future<void> markNotificationRead(String id) async {
    await _db.collection('notifications').doc(id).update({'read': true});
  }

  Stream<Map<String, dynamic>?> settingsStream() {
    return _db.collection('settings').doc('app').snapshots().map((d) => d.exists ? d.data() : null);
  }

  Future<void> updateSettings(Map<String, dynamic> data) async {
    await _db.collection('settings').doc('app').set(data, SetOptions(merge: true));
  }
}
