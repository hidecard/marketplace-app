import 'package:cloud_firestore/cloud_firestore.dart';
import 'models_part1.dart';

class Category {
  final String id;
  final String name;
  final String slug;
  final String? icon;
  final String? parentId;
  final int order;
  Category({
    required this.id,
    this.name = '',
    this.slug = '',
    this.icon,
    this.parentId,
    this.order = 0,
  });
  factory Category.fromMap(Map<String, dynamic> m, String id) => Category(
        id: id,
        name: m['name'] as String? ?? '',
        slug: m['slug'] as String? ?? '',
        icon: m['icon'] as String?,
        parentId: m['parentId'] as String?,
        order: m['order'] as int? ?? 0,
      );
  Map<String, dynamic> toMap() => {
        'name': name,
        'slug': slug,
        'icon': icon,
        'parentId': parentId,
        'order': order,
      };
}

class CartItem {
  final String productId;
  final String shopId;
  final String title;
  final String image;
  final double price;
  final int quantity;
  final double subtotal;
  final int stock;
  CartItem({
    required this.productId,
    required this.shopId,
    this.title = '',
    this.image = '',
    this.price = 0,
    this.quantity = 1,
    this.subtotal = 0,
    this.stock = 0,
  });
  factory CartItem.fromMap(Map<String, dynamic> m) => CartItem(
        productId: m['productId'] as String? ?? '',
        shopId: m['shopId'] as String? ?? '',
        title: m['title'] as String? ?? '',
        image: m['image'] as String? ?? '',
        price: (m['price'] as num?)?.toDouble() ?? 0,
        quantity: m['quantity'] as int? ?? 1,
        subtotal: (m['subtotal'] as num?)?.toDouble() ?? 0,
        stock: m['stock'] as int? ?? 0,
      );
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'shopId': shopId,
        'title': title,
        'image': image,
        'price': price,
        'quantity': quantity,
        'subtotal': subtotal,
        'stock': stock,
      };
  CartItem copyWith({int? quantity, double? subtotal}) => CartItem(
        productId: productId,
        shopId: shopId,
        title: title,
        image: image,
        price: price,
        quantity: quantity ?? this.quantity,
        subtotal: subtotal ?? this.subtotal,
        stock: stock,
      );
}

enum OrderStatus {
  pending,
  confirmed,
  preparing,
  shipped,
  outForDelivery,
  delivered,
  completed,
  cancelled,
  rejected,
}

OrderStatus orderStatusFromString(String? s) {
  switch (s) {
    case 'confirmed':
      return OrderStatus.confirmed;
    case 'preparing':
      return OrderStatus.preparing;
    case 'shipped':
      return OrderStatus.shipped;
    case 'out_for_delivery':
      return OrderStatus.outForDelivery;
    case 'delivered':
      return OrderStatus.delivered;
    case 'completed':
      return OrderStatus.completed;
    case 'cancelled':
      return OrderStatus.cancelled;
    case 'rejected':
      return OrderStatus.rejected;
    default:
      return OrderStatus.pending;
  }
}

String orderStatusToString(OrderStatus s) {
  switch (s) {
    case OrderStatus.confirmed:
      return 'confirmed';
    case OrderStatus.preparing:
      return 'preparing';
    case OrderStatus.shipped:
      return 'shipped';
    case OrderStatus.outForDelivery:
      return 'out_for_delivery';
    case OrderStatus.delivered:
      return 'delivered';
    case OrderStatus.completed:
      return 'completed';
    case OrderStatus.cancelled:
      return 'cancelled';
    case OrderStatus.rejected:
      return 'rejected';
    default:
      return 'pending';
  }
}

enum PaymentMethod { cash, kbzpay, wavepay, bankTransfer, other, cod }

PaymentMethod paymentMethodFromString(String? s) {
  switch (s) {
    case 'kbzpay':
      return PaymentMethod.kbzpay;
    case 'wavepay':
      return PaymentMethod.wavepay;
    case 'bank_transfer':
      return PaymentMethod.bankTransfer;
    case 'other':
      return PaymentMethod.other;
    case 'cod':
      return PaymentMethod.cod;
    default:
      return PaymentMethod.cash;
  }
}

enum PaymentStatus { pending, paid, refunded }

PaymentStatus paymentStatusFromString(String? s) {
  switch (s) {
    case 'paid':
      return PaymentStatus.paid;
    case 'refunded':
      return PaymentStatus.refunded;
    default:
      return PaymentStatus.pending;
  }
}

String paymentStatusToString(PaymentStatus s) {
  switch (s) {
    case PaymentStatus.paid:
      return 'paid';
    case PaymentStatus.refunded:
      return 'refunded';
    default:
      return 'pending';
  }
}

class OrderItem {
  final String productId;
  final String title;
  final String image;
  final double price;
  final int quantity;
  final double subtotal;
  OrderItem({
    required this.productId,
    this.title = '',
    this.image = '',
    this.price = 0,
    this.quantity = 1,
    this.subtotal = 0,
  });
  factory OrderItem.fromMap(Map<String, dynamic> m) => OrderItem(
        productId: m['productId'] as String? ?? '',
        title: m['title'] as String? ?? '',
        image: m['image'] as String? ?? '',
        price: (m['price'] as num?)?.toDouble() ?? 0,
        quantity: m['quantity'] as int? ?? 1,
        subtotal: (m['subtotal'] as num?)?.toDouble() ?? 0,
      );
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'title': title,
        'image': image,
        'price': price,
        'quantity': quantity,
        'subtotal': subtotal,
      };
}

class Order {
  final String id;
  final String orderNumber;
  final String buyerId;
  final String shopId;
  final List<OrderItem> items;
  final double subtotal;
  final double deliveryFee;
  final double discount;
  final double total;
  final PaymentMethod paymentMethod;
  final PaymentStatus paymentStatus;
  final OrderStatus status;
  final Address shippingAddress;
  final String? note;
  final int codRejectionCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Order({
    required this.id,
    this.orderNumber = '',
    this.buyerId = '',
    this.shopId = '',
    this.items = const [],
    this.subtotal = 0,
    this.deliveryFee = 0,
    this.discount = 0,
    this.total = 0,
    this.paymentMethod = PaymentMethod.cash,
    this.paymentStatus = PaymentStatus.pending,
    this.status = OrderStatus.pending,
    required this.shippingAddress,
    this.note,
    this.codRejectionCount = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory Order.fromMap(Map<String, dynamic> m, String id) => Order(
        id: id,
        orderNumber: m['orderNumber'] as String? ?? '',
        buyerId: m['buyerId'] as String? ?? '',
        shopId: m['shopId'] as String? ?? '',
        items: (m['items'] as List?)
                ?.map((e) => OrderItem.fromMap(e as Map<String, dynamic>))
                .toList() ??
            const [],
        subtotal: (m['subtotal'] as num?)?.toDouble() ?? 0,
        deliveryFee: (m['deliveryFee'] as num?)?.toDouble() ?? 0,
        discount: (m['discount'] as num?)?.toDouble() ?? 0,
        total: (m['total'] as num?)?.toDouble() ?? 0,
        paymentMethod: paymentMethodFromString(m['paymentMethod'] as String?),
        paymentStatus: paymentStatusFromString(m['paymentStatus'] as String?),
        status: orderStatusFromString(m['status'] as String?),
        shippingAddress: Address.fromMap(
            (m['shippingAddress'] as Map<String, dynamic>?) ?? {}, 'shipping'),
        note: m['note'] as String?,
        codRejectionCount: m['codRejectionCount'] as int? ?? 0,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
        updatedAt: (m['updatedAt'] as Timestamp?)?.toDate(),
      );

  Map<String, dynamic> toMap() => {
        'orderNumber': orderNumber,
        'buyerId': buyerId,
        'shopId': shopId,
        'items': items.map((e) => e.toMap()).toList(),
        'subtotal': subtotal,
        'deliveryFee': deliveryFee,
        'discount': discount,
        'total': total,
        'paymentMethod': paymentMethodToStringForModel(paymentMethod),
        'paymentStatus': paymentStatusToString(paymentStatus),
        'status': orderStatusToString(status),
        'shippingAddress': shippingAddress.toMap(),
        'note': note,
        'codRejectionCount': codRejectionCount,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
        'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      };

  static String statusToString(OrderStatus s) => orderStatusToString(s);
  static String paymentMethodToString(PaymentMethod p) =>
      paymentMethodToStringForModel(p);
  static String paymentStatusToString(PaymentStatus p) =>
      paymentStatusToString(p);
}

String paymentMethodToStringForModel(PaymentMethod p) {
  switch (p) {
    case PaymentMethod.kbzpay:
      return 'kbzpay';
    case PaymentMethod.wavepay:
      return 'wavepay';
    case PaymentMethod.bankTransfer:
      return 'bank_transfer';
    case PaymentMethod.other:
      return 'other';
    case PaymentMethod.cod:
      return 'cod';
    default:
      return 'cash';
  }
}

class Review {
  final String id;
  final String productId;
  final String shopId;
  final String buyerId;
  final String orderId;
  final int rating;
  final String comment;
  final List<String> images;
  final DateTime? createdAt;
  Review({
    required this.id,
    this.productId = '',
    this.shopId = '',
    this.buyerId = '',
    this.orderId = '',
    this.rating = 5,
    this.comment = '',
    this.images = const [],
    this.createdAt,
  });
  factory Review.fromMap(Map<String, dynamic> m, String id) => Review(
        id: id,
        productId: m['productId'] as String? ?? '',
        shopId: m['shopId'] as String? ?? '',
        buyerId: m['buyerId'] as String? ?? '',
        orderId: m['orderId'] as String? ?? '',
        rating: m['rating'] as int? ?? 5,
        comment: m['comment'] as String? ?? '',
        images:
            (m['images'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'shopId': shopId,
        'buyerId': buyerId,
        'orderId': orderId,
        'rating': rating,
        'comment': comment,
        'images': images,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}

enum OfferStatus { pending, accepted, rejected, countered, expired }

OfferStatus offerStatusFromString(String? s) {
  switch (s) {
    case 'accepted':
      return OfferStatus.accepted;
    case 'rejected':
      return OfferStatus.rejected;
    case 'countered':
      return OfferStatus.countered;
    case 'expired':
      return OfferStatus.expired;
    default:
      return OfferStatus.pending;
  }
}

String offerStatusToString(OfferStatus s) {
  switch (s) {
    case OfferStatus.accepted:
      return 'accepted';
    case OfferStatus.rejected:
      return 'rejected';
    case OfferStatus.countered:
      return 'countered';
    case OfferStatus.expired:
      return 'expired';
    default:
      return 'pending';
  }
}

class Offer {
  final String id;
  final String chatId;
  final String productId;
  final String buyerId;
  final String sellerId;
  final double price;
  final OfferStatus status;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  Offer({
    required this.id,
    this.chatId = '',
    this.productId = '',
    this.buyerId = '',
    this.sellerId = '',
    this.price = 0,
    this.status = OfferStatus.pending,
    this.createdAt,
    this.updatedAt,
  });
  factory Offer.fromMap(Map<String, dynamic> m, String id) => Offer(
        id: id,
        chatId: m['chatId'] as String? ?? '',
        productId: m['productId'] as String? ?? '',
        buyerId: m['buyerId'] as String? ?? '',
        sellerId: m['sellerId'] as String? ?? '',
        price: (m['price'] as num?)?.toDouble() ?? 0,
        status: offerStatusFromString(m['status'] as String?),
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
        updatedAt: (m['updatedAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'chatId': chatId,
        'productId': productId,
        'buyerId': buyerId,
        'sellerId': sellerId,
        'price': price,
        'status': offerStatusToString(status),
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
        'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      };
  static String statusToString(OfferStatus s) => offerStatusToString(s);
}

enum MessageType { text, image, product, offer }

MessageType messageTypeFromString(String? s) {
  switch (s) {
    case 'image':
      return MessageType.image;
    case 'product':
      return MessageType.product;
    case 'offer':
      return MessageType.offer;
    default:
      return MessageType.text;
  }
}

String messageTypeToString(MessageType t) {
  switch (t) {
    case MessageType.image:
      return 'image';
    case MessageType.product:
      return 'product';
    case MessageType.offer:
      return 'offer';
    default:
      return 'text';
  }
}

class ChatMessage {
  final String id;
  final String chatId;
  final String senderId;
  final String content;
  final MessageType type;
  final bool read;
  final DateTime? createdAt;
  ChatMessage({
    required this.id,
    this.chatId = '',
    this.senderId = '',
    this.content = '',
    this.type = MessageType.text,
    this.read = false,
    this.createdAt,
  });
  factory ChatMessage.fromMap(Map<String, dynamic> m, String id) => ChatMessage(
        id: id,
        chatId: m['chatId'] as String? ?? '',
        senderId: m['senderId'] as String? ?? '',
        content: m['content'] as String? ?? '',
        type: messageTypeFromString(m['type'] as String?),
        read: m['read'] as bool? ?? false,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'chatId': chatId,
        'senderId': senderId,
        'content': content,
        'type': messageTypeToString(type),
        'read': read,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
  static String typeToString(MessageType t) => messageTypeToString(t);
}

class Chat {
  final String id;
  final List<String> participants;
  final String? productId;
  final String? orderId;
  final String? lastMessage;
  final DateTime? lastMessageAt;
  final String? lastMessageBy;
  final DateTime? createdAt;
  Chat({
    required this.id,
    this.participants = const [],
    this.productId,
    this.orderId,
    this.lastMessage,
    this.lastMessageAt,
    this.lastMessageBy,
    this.createdAt,
  });
  factory Chat.fromMap(Map<String, dynamic> m, String id) => Chat(
        id: id,
        participants:
            (m['participants'] as List?)?.map((e) => e.toString()).toList() ??
                const [],
        productId: m['productId'] as String?,
        orderId: m['orderId'] as String?,
        lastMessage: m['lastMessage'] as String?,
        lastMessageAt: (m['lastMessageAt'] as Timestamp?)?.toDate(),
        lastMessageBy: m['lastMessageBy'] as String?,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
      );
  Map<String, dynamic> toMap() => {
        'participants': participants,
        'productId': productId,
        'orderId': orderId,
        'lastMessage': lastMessage,
        'lastMessageAt':
            lastMessageAt != null ? Timestamp.fromDate(lastMessageAt!) : null,
        'lastMessageBy': lastMessageBy,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
      };
}
