import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class BusinessState extends Equatable {
  final bool isLoading;
  final Shop? shop;
  final List<Product> products;
  final List<Order> orders;
  final List<POSSale> posSales;
  final double totalRevenue;
  final int totalOrders;
  final String? error;

  const BusinessState({
    this.isLoading = false,
    this.shop,
    this.products = const [],
    this.orders = const [],
    this.posSales = const [],
    this.totalRevenue = 0,
    this.totalOrders = 0,
    this.error,
  });

  BusinessState copyWith({
    bool? isLoading,
    Shop? shop,
    List<Product>? products,
    List<Order>? orders,
    List<POSSale>? posSales,
    double? totalRevenue,
    int? totalOrders,
    String? error,
    bool clearError = false,
  }) {
    return BusinessState(
      isLoading: isLoading ?? this.isLoading,
      shop: shop ?? this.shop,
      products: products ?? this.products,
      orders: orders ?? this.orders,
      posSales: posSales ?? this.posSales,
      totalRevenue: totalRevenue ?? this.totalRevenue,
      totalOrders: totalOrders ?? this.totalOrders,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props =>
      [isLoading, shop?.id, products, orders, posSales, totalRevenue, totalOrders, error];
}

class BusinessCubit extends Cubit<BusinessState> {
  final FirestoreService _fs = FirestoreService();

  BusinessCubit() : super(const BusinessState());

  void loadDashboard(Shop shop) {
    emit(state.copyWith(isLoading: true, shop: shop, clearError: true));
    _fs.productsByShopStream(shop.id).listen((products) {
      emit(state.copyWith(products: products));
    });
    _fs.ordersByShopStream(shop.id).listen((orders) {
      final revenue = orders
          .where((o) =>
              o.status == OrderStatus.delivered || o.status == OrderStatus.completed)
          .fold<double>(0, (sum, o) => sum + o.total);
      emit(state.copyWith(orders: orders, totalRevenue: revenue, totalOrders: orders.length));
    });
    _fs.posSalesStream(shop.id).listen((sales) {
      emit(state.copyWith(posSales: sales));
    });
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!isClosed) emit(state.copyWith(isLoading: false));
    });
  }

  Future<void> createShop(Shop shop) async {
    await _fs.createShop(shop);
    emit(state.copyWith(shop: shop));
  }

  Future<void> updateShop(Shop shop) async {
    await _fs.updateShop(shop);
    emit(state.copyWith(shop: shop));
  }

  Future<void> updateOrderStatus(String id, OrderStatus status) async {
    await _fs.updateOrderStatus(id, status);
  }

  Future<void> setShop(Shop shop) async {
    emit(state.copyWith(shop: shop));
    loadDashboard(shop);
  }
}