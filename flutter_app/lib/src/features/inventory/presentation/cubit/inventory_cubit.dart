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

  InventoryCubit() : super(const InventoryState());

  void bind(String shopId, String userId) {
    _shopId = shopId;
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.inventoryMovementsStream(shopId).listen(
      (movements) => emit(state.copyWith(isLoading: false, movements: movements)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  Future<void> adjustStock(Product product, InventoryMovementType type, int qty) async {
    if (_shopId == null) return;
    final typeName = switch (type) {
      InventoryMovementType.increment => 'increment',
      InventoryMovementType.decrement => 'decrement',
      InventoryMovementType.set => 'set',
    };
    await _fs.callableVoid('adjustStock', params: {
      'productId': product.id,
      'shopId': _shopId,
      'type': typeName,
      'quantity': qty,
      'reason': 'manual',
      'idempotencyKey': 'adj-${product.id}-${DateTime.now().millisecondsSinceEpoch}',
    });
  }
}