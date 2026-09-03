import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

enum ProductFilter { all, newArrivals, popular, priceLowHigh, priceHighLow }

class ProductsState extends Equatable {
  final bool isLoading;
  final List<Product> products;
  final String? searchQuery;
  final String? categoryId;
  final ProductCondition? condition;
  final double? minPrice;
  final double? maxPrice;
  final bool? verifiedOnly;
  final ProductFilter filter;
  final String? error;

  const ProductsState({
    this.isLoading = false,
    this.products = const [],
    this.searchQuery,
    this.categoryId,
    this.condition,
    this.minPrice,
    this.maxPrice,
    this.verifiedOnly,
    this.filter = ProductFilter.all,
    this.error,
  });

  ProductsState copyWith({
    bool? isLoading,
    List<Product>? products,
    String? searchQuery,
    String? categoryId,
    ProductCondition? condition,
    double? minPrice,
    double? maxPrice,
    bool? verifiedOnly,
    ProductFilter? filter,
    String? error,
    bool clearError = false,
    bool clearCondition = false,
  }) {
    return ProductsState(
      isLoading: isLoading ?? this.isLoading,
      products: products ?? this.products,
      searchQuery: searchQuery ?? this.searchQuery,
      categoryId: categoryId ?? this.categoryId,
      condition: clearCondition ? null : (condition ?? this.condition),
      minPrice: minPrice ?? this.minPrice,
      maxPrice: maxPrice ?? this.maxPrice,
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
      filter: filter ?? this.filter,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props =>
      [isLoading, products, searchQuery, categoryId, condition, minPrice, maxPrice, verifiedOnly, filter, error];
}

class ProductsCubit extends Cubit<ProductsState> {
  final FirestoreService _fs = FirestoreService();

  ProductsCubit() : super(const ProductsState());

  void loadAll({int? limit}) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.productsStream(limit: limit).listen(
      (products) => emit(state.copyWith(isLoading: false, products: products)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void loadByCategory(String categoryId) {
    emit(state.copyWith(isLoading: true, categoryId: categoryId, clearError: true));
    _fs.productsByCategoryStream(categoryId).listen(
      (products) => emit(state.copyWith(isLoading: false, products: products)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void loadByShop(String shopId) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.productsByShopStream(shopId).listen(
      (products) => emit(state.copyWith(isLoading: false, products: products)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void search(String query) {
    emit(state.copyWith(searchQuery: query, isLoading: true, clearError: true));
    _fs.productsStream().listen(
      (products) {
        final filtered = query.isEmpty
            ? products
            : products
                .where((p) =>
                    p.title.toLowerCase().contains(query.toLowerCase()) ||
                    p.description.toLowerCase().contains(query.toLowerCase()))
                .toList();
        emit(state.copyWith(isLoading: false, products: filtered));
      },
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void setCondition(ProductCondition? condition) {
    emit(state.copyWith(condition: condition, clearCondition: condition == null));
  }

  void setPriceRange(double? min, double? max) {
    emit(state.copyWith(minPrice: min, maxPrice: max));
  }

  void setVerifiedOnly(bool? v) {
    emit(state.copyWith(verifiedOnly: v));
  }

  void setFilter(ProductFilter f) {
    emit(state.copyWith(filter: f));
  }

  Future<Product?> getProduct(String id) async {
    try {
      return await _fs.getProduct(id);
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
      return null;
    }
  }

  Future<void> deleteProduct(String id) async {
    await _fs.deleteProduct(id);
  }
}