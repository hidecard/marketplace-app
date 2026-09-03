import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class InventoryState extends Equatable {
  final bool isLoading;
  final List<InventoryMovement> movements;
  final String? error;

  const InventoryState({this.isLoading = false, this.movements = const [], this.error});

  InventoryState copyWith({bool? isLoading, List<InventoryMovement>? movements, String? error, bool clearError = false}) {
    return InventoryState(
      isLoading: isLoading ?? this.isLoading,
      movements: movements ?? this.movements,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, movements, error];
}

class InventoryCubit extends Cubit<InventoryState> {
  final FirestoreService _fs = FirestoreService();
  String? _shopId;
  String? _userId;

  InventoryCubit() : super(const InventoryState());

  void bind(String shopId, String userId) {
    _shopId = shopId;
    _userId = userId;
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.inventoryMovementsStream(shopId).listen(
      (movements) => emit(state.copyWith(isLoading: false, movements: movements)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  Future<void> adjustStock(Product product, InventoryMovementType type, int qty) async {
    if (_shopId == null || _userId == null) return;
    final previous = product.stock;
    int newStock;
    switch (type) {
      case InventoryMovementType.increment:
        newStock = previous + qty;
        break;
      case InventoryMovementType.decrement:
        newStock = (previous - qty).clamp(0, 1 << 30);
        break;
      case InventoryMovementType.set:
        newStock = qty;
        break;
    }
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final movement = InventoryMovement(
      id: id,
      productId: product.id,
      shopId: _shopId!,
      type: type,
      quantity: qty,
      previousStock: previous,
      newStock: newStock,
      userId: _userId ?? '',
    );
    await _fs.createInventoryMovement(movement);
    await _fs.updateProductStock(product.id, newStock);
  }
}