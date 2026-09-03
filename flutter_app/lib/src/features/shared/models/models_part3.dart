import 'package:cloud_firestore/cloud_firestore.dart';

class Expense {
  final String id;
  final String shopId;
  final String category;
  final double amount;
  final String description;
  final DateTime? date;
  final DateTime? createdAt;
  Expense({
    required this.id,
    this.shopId = '',
    this.category = '',
    this.amount = 0,
    this.description = '',
    this.date,
    this.createdAt,
  });
  factory Expense.fromMap(Map<String, dynamic> m, String id) => Expense(
        id: id,
        shopId: m['shopId'] as String? ?? '',
        category: m['category'] as String? ?? '',
        amount: (m['amount'] as num?)?.toDouble() ?? 0,
        description: m['description'] as String? ?? '',
        date: (m['date'] as Timestamp?)?.toDate(),
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'shopId': shopId,
        'category': category,
        'amount': amount,
        'description': description,
        'date': date != null ? Timestamp.fromDate(date!) : null,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}

enum InventoryMovementType { increment, decrement, set }

InventoryMovementType inventoryMovementTypeFromString(String? s) {
  switch (s) {
    case 'decrement':
      return InventoryMovementType.decrement;
    case 'set':
      return InventoryMovementType.set;
    default:
      return InventoryMovementType.increment;
  }
}

String inventoryMovementTypeToString(InventoryMovementType t) {
  switch (t) {
    case InventoryMovementType.decrement:
      return 'decrement';
    case InventoryMovementType.set:
      return 'set';
    default:
      return 'increment';
  }
}

class InventoryMovement {
  final String id;
  final String productId;
  final String shopId;
  final InventoryMovementType type;
  final int quantity;
  final int previousStock;
  final int newStock;
  final String userId;
  final DateTime? createdAt;
  InventoryMovement({
    required this.id,
    this.productId = '',
    this.shopId = '',
    this.type = InventoryMovementType.increment,
    this.quantity = 0,
    this.previousStock = 0,
    this.newStock = 0,
    this.userId = '',
    this.createdAt,
  });
  factory InventoryMovement.fromMap(Map<String, dynamic> m, String id) =>
      InventoryMovement(
        id: id,
        productId: m['productId'] as String? ?? '',
        shopId: m['shopId'] as String? ?? '',
        type: inventoryMovementTypeFromString(m['type'] as String?),
        quantity: m['quantity'] as int? ?? 0,
        previousStock: m['previousStock'] as int? ?? 0,
        newStock: m['newStock'] as int? ?? 0,
        userId: m['userId'] as String? ?? '',
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'shopId': shopId,
        'type': inventoryMovementTypeToString(type),
        'quantity': quantity,
        'previousStock': previousStock,
        'newStock': newStock,
        'userId': userId,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}

class POSItem {
  final String productId;
  final String title;
  final double price;
  final double costPrice;
  final int quantity;
  final double subtotal;
  POSItem({
    required this.productId,
    this.title = '',
    this.price = 0,
    this.costPrice = 0,
    this.quantity = 1,
    this.subtotal = 0,
  });
  factory POSItem.fromMap(Map<String, dynamic> m) => POSItem(
        productId: m['productId'] as String? ?? '',
        title: m['title'] as String? ?? '',
        price: (m['price'] as num?)?.toDouble() ?? 0,
        costPrice: (m['costPrice'] as num?)?.toDouble() ?? 0,
        quantity: m['quantity'] as int? ?? 1,
        subtotal: (m['subtotal'] as num?)?.toDouble() ?? 0,
      );
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'title': title,
        'price': price,
        'costPrice': costPrice,
        'quantity': quantity,
        'subtotal': subtotal,
      };
}

class POSSale {
  final String id;
  final String shopId;
  final List<POSItem> items;
  final double subtotal;
  final double discount;
  final double total;
  final String paymentMethod;
  final String? customerName;
  final String? customerPhone;
  final String? note;
  final DateTime? createdAt;
  POSSale({
    required this.id,
    this.shopId = '',
    this.items = const [],
    this.subtotal = 0,
    this.discount = 0,
    this.total = 0,
    this.paymentMethod = 'cash',
    this.customerName,
    this.customerPhone,
    this.note,
    this.createdAt,
  });
  factory POSSale.fromMap(Map<String, dynamic> m, String id) => POSSale(
        id: id,
        shopId: m['shopId'] as String? ?? '',
        items: (m['items'] as List?)
                ?.map((e) => POSItem.fromMap(e as Map<String, dynamic>))
                .toList() ??
            const [],
        subtotal: (m['subtotal'] as num?)?.toDouble() ?? 0,
        discount: (m['discount'] as num?)?.toDouble() ?? 0,
        total: (m['total'] as num?)?.toDouble() ?? 0,
        paymentMethod: m['paymentMethod'] as String? ?? 'cash',
        customerName: m['customerName'] as String?,
        customerPhone: m['customerPhone'] as String?,
        note: m['note'] as String?,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'shopId': shopId,
        'items': items.map((e) => e.toMap()).toList(),
        'subtotal': subtotal,
        'discount': discount,
        'total': total,
        'paymentMethod': paymentMethod,
        'customerName': customerName,
        'customerPhone': customerPhone,
        'note': note,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}

class Customer {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final int totalOrders;
  final double totalSpent;
  final DateTime? lastOrderAt;
  final DateTime? createdAt;
  Customer({
    required this.id,
    this.name = '',
    this.phone = '',
    this.email,
    this.totalOrders = 0,
    this.totalSpent = 0,
    this.lastOrderAt,
    this.createdAt,
  });
  factory Customer.fromMap(Map<String, dynamic> m, String id) => Customer(
        id: id,
        name: m['name'] as String? ?? '',
        phone: m['phone'] as String? ?? '',
        email: m['email'] as String?,
        totalOrders: m['totalOrders'] as int? ?? 0,
        totalSpent: (m['totalSpent'] as num?)?.toDouble() ?? 0,
        lastOrderAt: (m['lastOrderAt'] as Timestamp?)?.toDate(),
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'name': name,
        'phone': phone,
        'email': email,
        'totalOrders': totalOrders,
        'totalSpent': totalSpent,
        'lastOrderAt':
            lastOrderAt != null ? Timestamp.fromDate(lastOrderAt!) : null,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}

enum VerificationRequestStatus { pending, approved, rejected }

VerificationRequestStatus verificationRequestStatusFromString(String? s) {
  switch (s) {
    case 'approved':
      return VerificationRequestStatus.approved;
    case 'rejected':
      return VerificationRequestStatus.rejected;
    default:
      return VerificationRequestStatus.pending;
  }
}

String verificationRequestStatusToString(VerificationRequestStatus s) {
  switch (s) {
    case VerificationRequestStatus.approved:
      return 'approved';
    case VerificationRequestStatus.rejected:
      return 'rejected';
    default:
      return 'pending';
  }
}

class VerificationRequest {
  final String id;
  final String userId;
  final String shopId;
  final String shopName;
  final String ownerName;
  final String phone;
  final String email;
  final String address;
  final String city;
  final String region;
  final String description;
  final String? facebookPage;
  final List<String> socialLinks;
  final List<String> shopPhotos;
  final VerificationRequestStatus status;
  final String? adminNote;
  final String? reviewedBy;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  VerificationRequest({
    required this.id,
    this.userId = '',
    this.shopId = '',
    this.shopName = '',
    this.ownerName = '',
    this.phone = '',
    this.email = '',
    this.address = '',
    this.city = '',
    this.region = '',
    this.description = '',
    this.facebookPage,
    this.socialLinks = const [],
    this.shopPhotos = const [],
    this.status = VerificationRequestStatus.pending,
    this.adminNote,
    this.reviewedBy,
    this.createdAt,
    this.updatedAt,
  });
  factory VerificationRequest.fromMap(Map<String, dynamic> m, String id) =>
      VerificationRequest(
        id: id,
        userId: m['userId'] as String? ?? '',
        shopId: m['shopId'] as String? ?? '',
        shopName: m['shopName'] as String? ?? '',
        ownerName: m['ownerName'] as String? ?? '',
        phone: m['phone'] as String? ?? '',
        email: m['email'] as String? ?? '',
        address: m['address'] as String? ?? '',
        city: m['city'] as String? ?? '',
        region: m['region'] as String? ?? '',
        description: m['description'] as String? ?? '',
        facebookPage: m['facebookPage'] as String?,
        socialLinks:
            (m['socialLinks'] as List?)?.map((e) => e.toString()).toList() ??
                const [],
        shopPhotos:
            (m['shopPhotos'] as List?)?.map((e) => e.toString()).toList() ??
                const [],
        status: verificationRequestStatusFromString(m['status'] as String?),
        adminNote: m['adminNote'] as String?,
        reviewedBy: m['reviewedBy'] as String?,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
        updatedAt: (m['updatedAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'userId': userId,
        'shopId': shopId,
        'shopName': shopName,
        'ownerName': ownerName,
        'phone': phone,
        'email': email,
        'address': address,
        'city': city,
        'region': region,
        'description': description,
        'facebookPage': facebookPage,
        'socialLinks': socialLinks,
        'shopPhotos': shopPhotos,
        'status': verificationRequestStatusToString(status),
        'adminNote': adminNote,
        'reviewedBy': reviewedBy,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
        'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      };
  static String statusToString(VerificationRequestStatus s) =>
      verificationRequestStatusToString(s);
}

enum ReportTargetType { product, shop, user }

ReportTargetType reportTargetTypeFromString(String? s) {
  switch (s) {
    case 'shop':
      return ReportTargetType.shop;
    case 'user':
      return ReportTargetType.user;
    default:
      return ReportTargetType.product;
  }
}

String reportTargetTypeToString(ReportTargetType t) {
  switch (t) {
    case ReportTargetType.shop:
      return 'shop';
    case ReportTargetType.user:
      return 'user';
    default:
      return 'product';
  }
}

enum ReportStatus { pending, resolved, dismissed }

ReportStatus reportStatusFromString(String? s) {
  switch (s) {
    case 'resolved':
      return ReportStatus.resolved;
    case 'dismissed':
      return ReportStatus.dismissed;
    default:
      return ReportStatus.pending;
  }
}

String reportStatusToString(ReportStatus s) {
  switch (s) {
    case ReportStatus.resolved:
      return 'resolved';
    case ReportStatus.dismissed:
      return 'dismissed';
    default:
      return 'pending';
  }
}

class Report {
  final String id;
  final String reporterId;
  final ReportTargetType targetType;
  final String targetId;
  final String reason;
  final String description;
  final ReportStatus status;
  final String? adminNote;
  final DateTime? createdAt;
  Report({
    required this.id,
    this.reporterId = '',
    this.targetType = ReportTargetType.product,
    this.targetId = '',
    this.reason = '',
    this.description = '',
    this.status = ReportStatus.pending,
    this.adminNote,
    this.createdAt,
  });
  factory Report.fromMap(Map<String, dynamic> m, String id) => Report(
        id: id,
        reporterId: m['reporterId'] as String? ?? '',
        targetType: reportTargetTypeFromString(m['targetType'] as String?),
        targetId: m['targetId'] as String? ?? '',
        reason: m['reason'] as String? ?? '',
        description: m['description'] as String? ?? '',
        status: reportStatusFromString(m['status'] as String?),
        adminNote: m['adminNote'] as String?,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'reporterId': reporterId,
        'targetType': reportTargetTypeToString(targetType),
        'targetId': targetId,
        'reason': reason,
        'description': description,
        'status': reportStatusToString(status),
        'adminNote': adminNote,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
  static String statusToString(ReportStatus s) => reportStatusToString(s);
}

class AppBanner {
  final String id;
  final String title;
  final String? subtitle;
  final String image;
  final String? link;
  final bool active;
  final int order;
  final DateTime? createdAt;
  AppBanner({
    required this.id,
    this.title = '',
    this.subtitle,
    this.image = '',
    this.link,
    this.active = true,
    this.order = 0,
    this.createdAt,
  });
  factory AppBanner.fromMap(Map<String, dynamic> m, String id) => AppBanner(
        id: id,
        title: m['title'] as String? ?? '',
        subtitle: m['subtitle'] as String?,
        image: m['image'] as String? ?? '',
        link: m['link'] as String?,
        active: m['active'] as bool? ?? true,
        order: m['order'] as int? ?? 0,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'title': title,
        'subtitle': subtitle,
        'image': image,
        'link': link,
        'active': active,
        'order': order,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}

class AppNotification {
  final String id;
  final String userId;
  final String type;
  final String title;
  final String body;
  final Map<String, String>? data;
  final bool read;
  final DateTime? createdAt;
  AppNotification({
    required this.id,
    this.userId = '',
    this.type = '',
    this.title = '',
    this.body = '',
    this.data,
    this.read = false,
    this.createdAt,
  });
  factory AppNotification.fromMap(Map<String, dynamic> m, String id) =>
      AppNotification(
        id: id,
        userId: m['userId'] as String? ?? '',
        type: m['type'] as String? ?? '',
        title: m['title'] as String? ?? '',
        body: m['body'] as String? ?? '',
        data: (m['data'] as Map<String, dynamic>?)
            ?.map((k, v) => MapEntry(k, v.toString())),
        read: m['read'] as bool? ?? false,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'userId': userId,
        'type': type,
        'title': title,
        'body': body,
        'data': data,
        'read': read,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}
