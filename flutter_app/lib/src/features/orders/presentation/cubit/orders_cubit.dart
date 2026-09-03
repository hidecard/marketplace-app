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
  String? _userId;
  String? _shopId;

  OrdersCubit() : super(const OrdersState());

  void loadForBuyer(String userId) {
    _userId = userId;
    _shopId = null;
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.ordersByBuyerStream(userId).listen(
      (orders) => emit(state.copyWith(isLoading: false, orders: orders)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void loadForShop(String shopId) {
    _shopId = shopId;
    _userId = null;
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

  Future<void> updateStatus(String id, OrderStatus status) async {
    await _fs.updateOrderStatus(id, status);
  }

  Future<String> create(Order order) async {
    await _fs.createOrder(order);
    return order.id;
  }
}