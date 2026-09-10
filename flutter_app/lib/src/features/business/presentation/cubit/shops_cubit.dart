import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ShopsState extends Equatable {
  final bool isLoading;
  final List<Shop> shops;
  final String? error;

  const ShopsState({this.isLoading = false, this.shops = const [], this.error});

  ShopsState copyWith({bool? isLoading, List<Shop>? shops, String? error, bool clearError = false}) {
    return ShopsState(
      isLoading: isLoading ?? this.isLoading,
      shops: shops ?? this.shops,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, shops, error];
}

class ShopsCubit extends Cubit<ShopsState> {
  final FirestoreService _fs = FirestoreService();

  ShopsCubit() : super(const ShopsState());

  void loadVerified({int? limit}) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.shopsStream(verifiedOnly: true).listen(
      (shops) {
        final list = limit != null && shops.length > limit ? shops.sublist(0, limit) : shops;
        emit(state.copyWith(isLoading: false, shops: list));
      },
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }
}
