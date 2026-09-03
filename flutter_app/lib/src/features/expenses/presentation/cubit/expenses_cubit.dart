import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ExpensesState extends Equatable {
  final bool isLoading;
  final List<Expense> expenses;
  final double total;
  final String? error;

  const ExpensesState({
    this.isLoading = false,
    this.expenses = const [],
    this.total = 0,
    this.error,
  });

  ExpensesState copyWith({bool? isLoading, List<Expense>? expenses, double? total, String? error, bool clearError = false}) {
    return ExpensesState(
      isLoading: isLoading ?? this.isLoading,
      expenses: expenses ?? this.expenses,
      total: total ?? this.total,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, expenses, total, error];
}

class ExpensesCubit extends Cubit<ExpensesState> {
  final FirestoreService _fs = FirestoreService();
  String? _shopId;

  ExpensesCubit() : super(const ExpensesState());

  void bind(String shopId) {
    _shopId = shopId;
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.expensesStream(shopId).listen(
      (expenses) {
        final total = expenses.fold<double>(0, (sum, e) => sum + e.amount);
        emit(state.copyWith(isLoading: false, expenses: expenses, total: total));
      },
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  Future<void> add(Expense e) async {
    await _fs.createExpense(e);
  }

  Future<void> remove(String id) async {
    await _fs.deleteExpense(id);
  }
}