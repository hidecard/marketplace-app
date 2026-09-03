import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole { user, admin }

enum UserStatus { active, suspended, banned }

UserRole userRoleFromString(String? s) =>
    s == 'admin' ? UserRole.admin : UserRole.user;

String userRoleToString(UserRole r) => r == UserRole.admin ? 'admin' : 'user';

UserStatus userStatusFromString(String? s) {
  switch (s) {
    case 'suspended':
      return UserStatus.suspended;
    case 'banned':
      return UserStatus.banned;
    default:
      return UserStatus.active;
  }
}

String userStatusToString(UserStatus s) {
  switch (s) {
    case UserStatus.suspended:
      return 'suspended';
    case UserStatus.banned:
      return 'banned';
    default:
      return 'active';
  }
}

class AppUser {
  final String uid;
  final String? email;
  final String? phoneNumber;
  final String displayName;
  final String? photoURL;
  final UserRole role;
  final bool phoneVerified;
  final bool shopVerified;
  final UserStatus status;
  final String? fcmToken;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  AppUser({
    required this.uid,
    this.email,
    this.phoneNumber,
    this.displayName = '',
    this.photoURL,
    this.role = UserRole.user,
    this.phoneVerified = false,
    this.shopVerified = false,
    this.status = UserStatus.active,
    this.fcmToken,
    this.createdAt,
    this.updatedAt,
  });

  bool get isAdmin => role == UserRole.admin;

  factory AppUser.fromMap(Map<String, dynamic> m, String uid) => AppUser(
        uid: uid,
        email: m['email'] as String?,
        phoneNumber: m['phoneNumber'] as String?,
        displayName: m['displayName'] as String? ?? '',
        photoURL: m['photoURL'] as String?,
        role: userRoleFromString(m['role'] as String?),
        phoneVerified: m['phoneVerified'] as bool? ?? false,
        shopVerified: m['shopVerified'] as bool? ?? false,
        status: userStatusFromString(m['status'] as String?),
        fcmToken: m['fcmToken'] as String?,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
        updatedAt: (m['updatedAt'] as Timestamp?)?.toDate(),
      );

  Map<String, dynamic> toMap() => {
        'email': email,
        'phoneNumber': phoneNumber,
        'displayName': displayName,
        'photoURL': photoURL,
        'role': userRoleToString(role),
        'phoneVerified': phoneVerified,
        'shopVerified': shopVerified,
        'status': userStatusToString(status),
        'fcmToken': fcmToken,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
        'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      };
}

class ShopSocialLinks {
  final String? facebook;
  final String? instagram;
  final String? tiktok;
  final String? website;
  ShopSocialLinks({this.facebook, this.instagram, this.tiktok, this.website});

  factory ShopSocialLinks.fromMap(Map<String, dynamic>? m) => ShopSocialLinks(
        facebook: m?['facebook'] as String?,
        instagram: m?['instagram'] as String?,
        tiktok: m?['tiktok'] as String?,
        website: m?['website'] as String?,
      );

  Map<String, dynamic> toMap() => {
        'facebook': facebook,
        'instagram': instagram,
        'tiktok': tiktok,
        'website': website,
      };
}

enum ShopVerificationStatus { notRequested, pending, approved, rejected }

ShopVerificationStatus shopVerificationFromString(String? s) {
  switch (s) {
    case 'pending':
      return ShopVerificationStatus.pending;
    case 'approved':
      return ShopVerificationStatus.approved;
    case 'rejected':
      return ShopVerificationStatus.rejected;
    default:
      return ShopVerificationStatus.notRequested;
  }
}

String shopVerificationToString(ShopVerificationStatus s) {
  switch (s) {
    case ShopVerificationStatus.pending:
      return 'pending';
    case ShopVerificationStatus.approved:
      return 'approved';
    case ShopVerificationStatus.rejected:
      return 'rejected';
    default:
      return 'not_requested';
  }
}

class Shop {
  final String id;
  final String ownerId;
  final String name;
  final String slug;
  final String description;
  final String? logo;
  final String? coverImage;
  final String phone;
  final String email;
  final String address;
  final String city;
  final String region;
  final double? lat;
  final double? lng;
  final ShopSocialLinks socialLinks;
  final bool verified;
  final ShopVerificationStatus verificationStatus;
  final double rating;
  final int totalReviews;
  final int totalProducts;
  final int totalSales;
  final int totalFollowers;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Shop({
    required this.id,
    required this.ownerId,
    this.name = '',
    this.slug = '',
    this.description = '',
    this.logo,
    this.coverImage,
    this.phone = '',
    this.email = '',
    this.address = '',
    this.city = '',
    this.region = '',
    this.lat,
    this.lng,
    ShopSocialLinks? socialLinks,
    this.verified = false,
    this.verificationStatus = ShopVerificationStatus.notRequested,
    this.rating = 0,
    this.totalReviews = 0,
    this.totalProducts = 0,
    this.totalSales = 0,
    this.totalFollowers = 0,
    this.createdAt,
    this.updatedAt,
  }) : socialLinks = socialLinks ?? ShopSocialLinks();

  factory Shop.fromMap(Map<String, dynamic> m, String id) => Shop(
        id: id,
        ownerId: m['ownerId'] as String? ?? '',
        name: m['name'] as String? ?? '',
        slug: m['slug'] as String? ?? '',
        description: m['description'] as String? ?? '',
        logo: m['logo'] as String?,
        coverImage: m['coverImage'] as String?,
        phone: m['phone'] as String? ?? '',
        email: m['email'] as String? ?? '',
        address: m['address'] as String? ?? '',
        city: m['city'] as String? ?? '',
        region: m['region'] as String? ?? '',
        lat: (m['lat'] as num?)?.toDouble(),
        lng: (m['lng'] as num?)?.toDouble(),
        socialLinks: ShopSocialLinks.fromMap(m['socialLinks'] as Map<String, dynamic>?),
        verified: m['verified'] as bool? ?? false,
        verificationStatus: shopVerificationFromString(m['verificationStatus'] as String?),
        rating: (m['rating'] as num?)?.toDouble() ?? 0,
        totalReviews: m['totalReviews'] as int? ?? 0,
        totalProducts: m['totalProducts'] as int? ?? 0,
        totalSales: m['totalSales'] as int? ?? 0,
        totalFollowers: m['totalFollowers'] as int? ?? 0,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
        updatedAt: (m['updatedAt'] as Timestamp?)?.toDate(),
      );

  Map<String, dynamic> toMap() => {
        'ownerId': ownerId,
        'name': name,
        'slug': slug,
        'description': description,
        'logo': logo,
        'coverImage': coverImage,
        'phone': phone,
        'email': email,
        'address': address,
        'city': city,
        'region': region,
        'lat': lat,
        'lng': lng,
        'socialLinks': socialLinks.toMap(),
        'verified': verified,
        'verificationStatus': shopVerificationToString(verificationStatus),
        'rating': rating,
        'totalReviews': totalReviews,
        'totalProducts': totalProducts,
        'totalSales': totalSales,
        'totalFollowers': totalFollowers,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
        'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      };

  Shop copyWith({
    String? name,
    String? slug,
    String? description,
    String? logo,
    String? coverImage,
    String? phone,
    String? email,
    String? address,
    String? city,
    String? region,
    double? lat,
    double? lng,
    ShopSocialLinks? socialLinks,
    bool? verified,
    ShopVerificationStatus? verificationStatus,
    double? rating,
    int? totalReviews,
    int? totalProducts,
    int? totalSales,
    int? totalFollowers,
  }) {
    return Shop(
      id: id,
      ownerId: ownerId,
      name: name ?? this.name,
      slug: slug ?? this.slug,
      description: description ?? this.description,
      logo: logo ?? this.logo,
      coverImage: coverImage ?? this.coverImage,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      address: address ?? this.address,
      city: city ?? this.city,
      region: region ?? this.region,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      socialLinks: socialLinks ?? this.socialLinks,
      verified: verified ?? this.verified,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      rating: rating ?? this.rating,
      totalReviews: totalReviews ?? this.totalReviews,
      totalProducts: totalProducts ?? this.totalProducts,
      totalSales: totalSales ?? this.totalSales,
      totalFollowers: totalFollowers ?? this.totalFollowers,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}

enum ProductCondition { newCondition, used, refurbished }

ProductCondition productConditionFromString(String? s) {
  switch (s) {
    case 'used':
      return ProductCondition.used;
    case 'refurbished':
      return ProductCondition.refurbished;
    default:
      return ProductCondition.newCondition;
  }
}

String productConditionToString(ProductCondition c) {
  switch (c) {
    case ProductCondition.used:
      return 'used';
    case ProductCondition.refurbished:
      return 'refurbished';
    default:
      return 'new';
  }
}

enum ProductStatus { active, inactive, sold, hidden }

ProductStatus productStatusFromString(String? s) {
  switch (s) {
    case 'inactive':
      return ProductStatus.inactive;
    case 'sold':
      return ProductStatus.sold;
    case 'hidden':
      return ProductStatus.hidden;
    default:
      return ProductStatus.active;
  }
}

String productStatusToString(ProductStatus s) {
  switch (s) {
    case ProductStatus.inactive:
      return 'inactive';
    case ProductStatus.sold:
      return 'sold';
    case ProductStatus.hidden:
      return 'hidden';
    default:
      return 'active';
  }
}

class Product {
  final String id;
  final String shopId;
  final String sellerId;
  final String title;
  final String description;
  final double price;
  final double? comparePrice;
  final double? costPrice;
  final String categoryId;
  final List<String> images;
  final ProductCondition condition;
  final int stock;
  final String? sku;
  final String? barcode;
  final double? weight;
  final ProductStatus status;
  final int views;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Product({
    required this.id,
    required this.shopId,
    required this.sellerId,
    this.title = '',
    this.description = '',
    this.price = 0,
    this.comparePrice,
    this.costPrice,
    this.categoryId = '',
    this.images = const [],
    this.condition = ProductCondition.newCondition,
    this.stock = 0,
    this.sku,
    this.barcode,
    this.weight,
    this.status = ProductStatus.active,
    this.views = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory Product.fromMap(Map<String, dynamic> m, String id) => Product(
        id: id,
        shopId: m['shopId'] as String? ?? '',
        sellerId: m['sellerId'] as String? ?? '',
        title: m['title'] as String? ?? '',
        description: m['description'] as String? ?? '',
        price: (m['price'] as num?)?.toDouble() ?? 0,
        comparePrice: (m['comparePrice'] as num?)?.toDouble(),
        costPrice: (m['costPrice'] as num?)?.toDouble(),
        categoryId: m['categoryId'] as String? ?? '',
        images: (m['images'] as List?)?.map((e) => e.toString()).toList() ?? const [],
        condition: productConditionFromString(m['condition'] as String?),
        stock: m['stock'] as int? ?? 0,
        sku: m['sku'] as String?,
        barcode: m['barcode'] as String?,
        weight: (m['weight'] as num?)?.toDouble(),
        status: productStatusFromString(m['status'] as String?),
        views: m['views'] as int? ?? 0,
        createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
        updatedAt: (m['updatedAt'] as Timestamp?)?.toDate(),
      );

  Map<String, dynamic> toMap() => {
        'shopId': shopId,
        'sellerId': sellerId,
        'title': title,
        'description': description,
        'price': price,
        'comparePrice': comparePrice,
        'costPrice': costPrice,
        'categoryId': categoryId,
        'images': images,
        'condition': productConditionToString(condition),
        'stock': stock,
        'sku': sku,
        'barcode': barcode,
        'weight': weight,
        'status': productStatusToString(status),
        'views': views,
        'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : null,
        'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      };
}

class Address {
  final String id;
  final String? userId;
  final String label;
  final String name;
  final String phone;
  final String address;
  final String city;
  final String region;
  final bool isDefault;

  Address({
    required this.id,
    this.userId,
    this.label = '',
    this.name = '',
    this.phone = '',
    this.address = '',
    this.city = '',
    this.region = '',
    this.isDefault = false,
  });

  factory Address.fromMap(Map<String, dynamic> m, String id) => Address(
        id: id,
        userId: m['userId'] as String?,
        label: m['label'] as String? ?? '',
        name: m['name'] as String? ?? '',
        phone: m['phone'] as String? ?? '',
        address: m['address'] as String? ?? '',
        city: m['city'] as String? ?? '',
        region: m['region'] as String? ?? '',
        isDefault: m['isDefault'] as bool? ?? false,
      );

  Map<String, dynamic> toMap() => {
        'userId': userId,
        'label': label,
        'name': name,
        'phone': phone,
        'address': address,
        'city': city,
        'region': region,
        'isDefault': isDefault,
      };
}
