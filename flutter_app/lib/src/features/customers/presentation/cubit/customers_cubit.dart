import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class CustomersState extends Equatable {
  final bool isLoading;
  final List<AppUser> customers;
  final String searchQuery;
  final String? error;

  const CustomersState({
    this.isLoading = false,
    this.customers = const [],
    this.searchQuery = '',
    this.error,
  });

  CustomersState copyWith({bool? isLoading, List<AppUser>? customers, String? searchQuery, String? error, bool clearError = false}) {
    return CustomersState(
      isLoading: isLoading ?? this.isLoading,
      customers: customers ?? this.customers,
      searchQuery: searchQuery ?? this.searchQuery,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, customers, searchQuery, error];
}

class CustomersCubit extends Cubit<CustomersState> {
  final FirestoreService _fs = FirestoreService();
  String? _shopId;

  CustomersCubit() : super(const CustomersState());

  void bind(String shopId) {
    _shopId = shopId;
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.customersStream(shopId).listen(
      (customers) => emit(state.copyWith(isLoading: false, customers: customers)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void search(String q) {
    emit(state.copyWith(searchQuery: q));
  }

  List<AppUser> get filtered {
    if (state.searchQuery.isEmpty) return state.customers;
    final q = state.searchQuery.toLowerCase();
    return state.customers.where((c) =>
        c.displayName.toLowerCase().contains(q) ||
        (c.email?.toLowerCase().contains(q) ?? false) ||
        (c.phoneNumber?.toLowerCase().contains(q) ?? false)).toList();
  }
}