import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:firebase_auth/firebase_auth.dart' as auth;
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class AuthState extends Equatable {
  final bool isLoading;
  final bool isAuthenticated;
  final auth.User? firebaseUser;
  final AppUser? appUser;
  final bool isAdmin;
  final Shop? shop;
  final String? error;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.firebaseUser,
    this.appUser,
    this.isAdmin = false,
    this.shop,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    auth.User? firebaseUser,
    AppUser? appUser,
    bool? isAdmin,
    Shop? shop,
    String? error,
    bool clearError = false,
    bool clearShop = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      firebaseUser: firebaseUser ?? this.firebaseUser,
      appUser: appUser ?? this.appUser,
      isAdmin: isAdmin ?? this.isAdmin,
      shop: clearShop ? null : (shop ?? this.shop),
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props =>
      [isLoading, isAuthenticated, firebaseUser?.uid, appUser?.uid, isAdmin, shop?.id, error];
}

class AuthCubit extends Cubit<AuthState> {
  final FirestoreService _fs = FirestoreService();

  AuthCubit() : super(const AuthState());

  Future<void> checkAuthStatus() async {
    final user = auth.FirebaseAuth.instance.currentUser;
    if (user == null) {
      emit(const AuthState());
      return;
    }
    emit(state.copyWith(isLoading: true));
    try {
      final appUser = await _fs.getUser(user.uid);
      AppUser nonNullUser = appUser ?? AppUser(
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName ?? (user.email?.split('@').first ?? 'User'),
        photoURL: user.photoURL,
      );
      if (appUser == null) {
        await _fs.createUser(nonNullUser);
      }
      final shop = await _fs.getShopByOwner(user.uid);
      emit(state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        firebaseUser: user,
        appUser: nonNullUser,
        isAdmin: nonNullUser.isAdmin,
        shop: shop,
        clearError: true,
      ));
    } catch (e) {
      emit(state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        firebaseUser: user,
        error: e.toString(),
      ));
    }
  }

  Future<void> signInWithEmailAndPassword(String email, String password) async {
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      final credential = await auth.FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      await _loadUser(credential.user!);
    } on auth.FirebaseAuthException catch (e) {
      emit(state.copyWith(isLoading: false, error: e.message ?? 'Sign in failed'));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> signUpWithEmailAndPassword(
      String email, String password, String displayName) async {
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      final credential = await auth.FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      final user = credential.user!;
      await user.updateDisplayName(displayName);
      final appUser = AppUser(
        uid: user.uid,
        email: email,
        displayName: displayName,
      );
      await _fs.createUser(appUser);
      emit(state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        firebaseUser: user,
        appUser: appUser,
      ));
    } on auth.FirebaseAuthException catch (e) {
      emit(state.copyWith(isLoading: false, error: e.message ?? 'Sign up failed'));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _loadUser(auth.User user) async {
    var appUser = await _fs.getUser(user.uid);
    if (appUser == null) {
      appUser = AppUser(
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName ?? (user.email?.split('@').first ?? 'User'),
        photoURL: user.photoURL,
      );
      await _fs.createUser(appUser);
    }
    final shop = await _fs.getShopByOwner(user.uid);
    emit(state.copyWith(
      isLoading: false,
      isAuthenticated: true,
      firebaseUser: user,
      appUser: appUser,
      isAdmin: appUser.isAdmin,
      shop: shop,
      clearError: true,
    ));
  }

  Future<void> setShop(Shop shop) async {
    emit(state.copyWith(shop: shop));
  }

  Future<void> updateAppUser(AppUser updated) async {
    await _fs.updateUser(updated);
    emit(state.copyWith(appUser: updated, isAdmin: updated.isAdmin));
  }

  Future<void> signOut() async {
    await auth.FirebaseAuth.instance.signOut();
    emit(const AuthState());
  }

  void clearError() {
    emit(state.copyWith(clearError: true));
  }
}