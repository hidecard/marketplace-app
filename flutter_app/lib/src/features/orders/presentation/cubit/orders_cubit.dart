import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class OrdersState extends Equatable {
  final bool isLoading;
  final List<Order> orders;
  final String? error;

  const OrdersState({this.isLoading = false, this.orders = const [], this.error});

  OrdersState copyWith({bool? isLoading, List<Order>? orders, String? error, bool clearError = false}) {
    return OrdersState(
      isLoading: isLoading ?? this.isLoading,
      orders: orders ?? this.orders,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, orders, error];
}

class OrdersCubit extends Cubit<OrdersState> {
  final FirestoreService _fs = FirestoreService();

  OrdersCubit() : super(const OrdersState());

  void loadForBuyer(String userId) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.ordersByBuyerStream(userId).listen(
      (orders) => emit(state.copyWith(isLoading: false, orders: orders)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void loadForShop(String shopId) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.ordersByShopStream(shopId).listen(
      (orders) => emit(state.copyWith(isLoading: false, orders: orders)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void loadAll() {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.allOrdersStream().listen(
      (orders) => emit(state.copyWith(isLoading: false, orders: orders)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  /// Server-authoritative status update via `updateOrderStatus` callable.
  Future<void> updateStatus(String id, OrderStatus status) async {
    await _fs.callableVoid('updateOrderStatus', params: {
      'orderId': id,
      'status': orderStatusToString(status),
      'idempotencyKey': '$id-${status.name}-${DateTime.now().millisecondsSinceEpoch}',
    });
  }

  /// Server-authoritative order creation via `createOrder` callable.
  /// Returns the created order id.
  Future<String> create({
    required List<Map<String, dynamic>> items,
    required Map<String, dynamic> address,
    required int deliveryFee,
    required int discount,
    required String paymentMethod,
    String? note,
  }) async {
    final id = 'ord_${DateTime.now().millisecondsSinceEpoch}';
    await _fs.callableVoid('createOrder', params: {
      'idempotencyKey': id,
      'items': items,
      'address': address,
      'deliveryFee': deliveryFee,
      'discount': discount,
      'paymentMethod': paymentMethod,
      // ignore: use_null_aware_elements
      if (note != null) 'note': note,
    });
    return id;
  }
}
