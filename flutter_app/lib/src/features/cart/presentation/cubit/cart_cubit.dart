import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class CartState extends Equatable {
  final bool isLoading;
  final List<CartItem> items;
  final String? error;

  const CartState({this.isLoading = false, this.items = const [], this.error});

  double get subtotal => items.fold(0.0, (sum, item) => sum + item.subtotal);

  CartState copyWith({bool? isLoading, List<CartItem>? items, String? error, bool clearError = false}) {
    return CartState(
      isLoading: isLoading ?? this.isLoading,
      items: items ?? this.items,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, items, error];
}

class CartCubit extends Cubit<CartState> {
  final FirestoreService _fs = FirestoreService();
  String? _userId;

  CartCubit() : super(const CartState());

  void bind(String userId) {
    if (_userId == userId) return;
    _userId = userId;
    emit(state.copyWith(isLoading: true));
    _fs.cartStream(userId).listen(
      (items) => emit(state.copyWith(isLoading: false, items: items)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  Future<void> add(CartItem item) async {
    if (_userId == null) return;
    final existing = state.items.firstWhere(
      (i) => i.productId == item.productId,
      orElse: () => item,
    );
    final newQty = existing.productId == item.productId
        ? existing.quantity + item.quantity
        : item.quantity;
    final updated = item.copyWith(quantity: newQty);
    await _fs.addToCart(_userId!, updated);
  }

  Future<void> remove(String productId) async {
    if (_userId == null) return;
    await _fs.removeFromCart(_userId!, productId);
  }

  Future<void> clear() async {
    if (_userId == null) return;
    await _fs.clearCart(_userId!);
  }
}