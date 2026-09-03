import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ReportsState extends Equatable {
  final bool isLoading;
  final List<Order> orders;
  final List<POSSale> posSales;
  final List<Expense> expenses;
  final DateTime startDate;
  final DateTime endDate;
  final String? error;

  const ReportsState({
    this.isLoading = false,
    this.orders = const [],
    this.posSales = const [],
    this.expenses = const [],
    required this.startDate,
    required this.endDate,
    this.error,
  });

  factory ReportsState.initial() => ReportsState(
        startDate: DateTime.now().subtract(const Duration(days: 30)),
        endDate: DateTime.now(),
      );

  double get totalRevenue {
    final orderRevenue = orders
        .where((o) =>
            o.status == OrderStatus.delivered || o.status == OrderStatus.completed)
        .fold<double>(0, (sum, o) => sum + o.total);
    final posRevenue = posSales.fold<double>(0, (sum, s) => sum + s.total);
    return orderRevenue + posRevenue;
  }

  double get totalExpenses =>
      expenses.fold<double>(0, (sum, e) => sum + e.amount);

  double get netProfit => totalRevenue - totalExpenses;

  int get totalOrders => orders.length + posSales.length;

  ReportsState copyWith({bool? isLoading, List<Order>? orders, List<POSSale>? posSales, List<Expense>? expenses, DateTime? startDate, DateTime? endDate, String? error, bool clearError = false}) {
    return ReportsState(
      isLoading: isLoading ?? this.isLoading,
      orders: orders ?? this.orders,
      posSales: posSales ?? this.posSales,
      expenses: expenses ?? this.expenses,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, orders, posSales, expenses, startDate, endDate, error];
}

class ReportsCubit extends Cubit<ReportsState> {
  final FirestoreService _fs = FirestoreService();

  ReportsCubit() : super(ReportsState.initial());

  void bind(String shopId) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.ordersByShopStream(shopId).listen((orders) {
      final filtered = orders.where((o) => _inRange(o.createdAt)).toList();
      emit(state.copyWith(orders: filtered));
    });
    _fs.posSalesStream(shopId).listen((sales) {
      final filtered = sales.where((s) => _inRange(s.createdAt)).toList();
      emit(state.copyWith(posSales: filtered));
    });
    _fs.expensesStream(shopId).listen((expenses) {
      final filtered = expenses.where((e) => _inRange(e.date)).toList();
      emit(state.copyWith(expenses: filtered, isLoading: false));
    });
  }

  bool _inRange(DateTime? d) {
    if (d == null) return false;
    return d.isAfter(state.startDate.subtract(const Duration(seconds: 1))) &&
        d.isBefore(state.endDate.add(const Duration(days: 1)));
  }

  void setDateRange(DateTime start, DateTime end) {
    emit(state.copyWith(startDate: start, endDate: end));
  }

  String exportJson() {
    return 'Net Profit: ${state.netProfit}, Revenue: ${state.totalRevenue}, Expenses: ${state.totalExpenses}';
  }
}