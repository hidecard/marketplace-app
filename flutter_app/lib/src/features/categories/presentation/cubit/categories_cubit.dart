import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class CategoriesState extends Equatable {
  final bool isLoading;
  final List<Category> categories;
  final String? error;
  const CategoriesState({this.isLoading = false, this.categories = const [], this.error});
  CategoriesState copyWith({bool? isLoading, List<Category>? categories, String? error, bool clearError = false}) {
    return CategoriesState(
      isLoading: isLoading ?? this.isLoading,
      categories: categories ?? this.categories,
      error: clearError ? null : (error ?? this.error),
    );
  }
  @override
  List<Object?> get props => [isLoading, categories, error];
}

class CategoriesCubit extends Cubit<CategoriesState> {
  final FirestoreService _fs = FirestoreService();
  CategoriesCubit() : super(const CategoriesState()) {
    load();
  }
  void load() {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.categoriesStream().listen(
      (cats) => emit(state.copyWith(isLoading: false, categories: cats)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }
  Future<void> create(Category c) async => _fs.createCategory(c);
  Future<void> update(Category c) async => _fs.updateCategory(c);
  Future<void> delete(String id) async => _fs.deleteCategory(id);
}