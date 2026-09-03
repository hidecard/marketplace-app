import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class POSState extends Equatable {
  final List<Product> availableProducts;
  final List<POSItem> cart;
  final String? customerName;
  final String? customerPhone;
  final String? note;
  final String paymentMethod;
  final double discount;
  final bool isCheckingOut;

  const POSState({
    this.availableProducts = const [],
    this.cart = const [],
    this.customerName,
    this.customerPhone,
    this.note,
    this.paymentMethod = 'cash',
    this.discount = 0,
    this.isCheckingOut = false,
  });

  double get subtotal => cart.fold(0, (sum, i) => sum + i.subtotal);
  double get total => subtotal - discount;

  POSState copyWith({
    List<Product>? availableProducts,
    List<POSItem>? cart,
    String? customerName,
    String? customerPhone,
    String? note,
    String? paymentMethod,
    double? discount,
    bool? isCheckingOut,
  }) {
    return POSState(
      availableProducts: availableProducts ?? this.availableProducts,
      cart: cart ?? this.cart,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      note: note ?? this.note,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      discount: discount ?? this.discount,
      isCheckingOut: isCheckingOut ?? this.isCheckingOut,
    );
  }

  @override
  List<Object?> get props =>
      [availableProducts, cart, customerName, customerPhone, note, paymentMethod, discount, isCheckingOut];
}

class POSCubit extends Cubit<POSState> {
  final FirestoreService _fs = FirestoreService();
  String? _shopId;

  POSCubit() : super(const POSState());

  void bind(String shopId) {
    _shopId = shopId;
    _fs.productsByShopStream(shopId).listen((products) {
      emit(state.copyWith(availableProducts: products));
    });
  }

  void addItem(Product product) {
    final existingIndex = state.cart.indexWhere((i) => i.productId == product.id);
    if (existingIndex >= 0) {
      final existing = state.cart[existingIndex];
      final newQty = existing.quantity + 1;
      final updated = POSItem(
        productId: existing.productId,
        title: existing.title,
        price: existing.price,
        costPrice: existing.costPrice,
        quantity: newQty,
        subtotal: existing.price * newQty,
      );
      final newCart = [...state.cart];
      newCart[existingIndex] = updated;
      emit(state.copyWith(cart: newCart));
    } else {
      final newItem = POSItem(
        productId: product.id,
        title: product.title,
        price: product.price,
        costPrice: product.costPrice ?? 0,
        quantity: 1,
        subtotal: product.price,
      );
      emit(state.copyWith(cart: [...state.cart, newItem]));
    }
  }

  void removeItem(String productId) {
    emit(state.copyWith(cart: state.cart.where((i) => i.productId != productId).toList()));
  }

  void updateQuantity(String productId, int qty) {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    final newCart = state.cart.map((i) {
      if (i.productId == productId) {
        return POSItem(
          productId: i.productId,
          title: i.title,
          price: i.price,
          costPrice: i.costPrice,
          quantity: qty,
          subtotal: i.price * qty,
        );
      }
      return i;
    }).toList();
    emit(state.copyWith(cart: newCart));
  }

  void setDiscount(double v) => emit(state.copyWith(discount: v));
  void setPaymentMethod(String m) => emit(state.copyWith(paymentMethod: m));
  void setCustomer({String? name, String? phone, String? note}) =>
      emit(state.copyWith(customerName: name, customerPhone: phone, note: note));
  void clear() => emit(const POSState());

  Future<String?> checkout() async {
    if (_shopId == null || state.cart.isEmpty) return null;
    emit(state.copyWith(isCheckingOut: true));
    try {
      final id = DateTime.now().millisecondsSinceEpoch.toString();
      final sale = POSSale(
        id: id,
        shopId: _shopId!,
        items: state.cart,
        subtotal: state.subtotal,
        discount: state.discount,
        total: state.total,
        paymentMethod: state.paymentMethod,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        note: state.note,
      );
      await _fs.createPOSSale(sale);
      for (final item in state.cart) {
        final product = await _fs.getProduct(item.productId);
        if (product != null) {
          final newStock = (product.stock - item.quantity).clamp(0, 1 << 30);
          await _fs.updateProductStock(product.id, newStock);
        }
      }
      emit(const POSState());
      return id;
    } catch (e) {
      emit(state.copyWith(isCheckingOut: false));
      return null;
    }
  }
}