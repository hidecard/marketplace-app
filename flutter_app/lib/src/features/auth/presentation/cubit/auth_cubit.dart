import 'dart:async';

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
  final String? verificationId;
  final String? error;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.firebaseUser,
    this.appUser,
    this.isAdmin = false,
    this.shop,
    this.verificationId,
    this.error,
  });

  bool get needsProfileSetup =>
      isAuthenticated &&
      (appUser == null ||
          appUser!.displayName.trim().isEmpty ||
          appUser!.displayName == 'User');

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    auth.User? firebaseUser,
    AppUser? appUser,
    bool? isAdmin,
    Shop? shop,
    String? verificationId,
    String? error,
    bool clearError = false,
    bool clearShop = false,
    bool clearVerificationId = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      firebaseUser: firebaseUser ?? this.firebaseUser,
      appUser: appUser ?? this.appUser,
      isAdmin: isAdmin ?? this.isAdmin,
      shop: clearShop ? null : (shop ?? this.shop),
      verificationId: clearVerificationId ? null : (verificationId ?? this.verificationId),
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [
        isLoading,
        isAuthenticated,
        firebaseUser?.uid,
        appUser?.uid,
        isAdmin,
        shop?.id,
        verificationId,
        error,
      ];
}

class AuthCubit extends Cubit<AuthState> {
  final FirestoreService _fs = FirestoreService();
  final auth.FirebaseAuth _auth = auth.FirebaseAuth.instance;
  StreamSubscription<auth.User?>? _userSub;

  AuthCubit() : super(const AuthState()) {
    _userSub = _auth.authStateChanges().listen(_onAuthChanged);
  }

  Future<void> _onAuthChanged(auth.User? user) async {
    if (user == null) {
      emit(const AuthState());
      return;
    }
    emit(state.copyWith(isLoading: true, firebaseUser: user, isAuthenticated: true));
    try {
      await _loadUser(user);
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> checkAuthStatus() async {
    // No-op: auth state is now driven by the authStateChanges stream.
  }

  Future<void> signInWithEmailAndPassword(String email, String password) async {
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      await _auth.signInWithEmailAndPassword(email: email, password: password);
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
      final credential = await _auth.createUserWithEmailAndPassword(
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
    } on auth.FirebaseAuthException catch (e) {
      emit(state.copyWith(isLoading: false, error: e.message ?? 'Sign up failed'));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> sendPhoneOtp(String phoneNumber) async {
    emit(state.copyWith(isLoading: true, clearError: true, clearVerificationId: true));
    try {
      await _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        timeout: const Duration(seconds: 60),
        verificationCompleted: (credential) async {
          await _auth.signInWithCredential(credential);
        },
        codeSent: (verificationId, _) {
          emit(state.copyWith(isLoading: false, verificationId: verificationId));
        },
        codeAutoRetrievalTimeout: (verificationId) {
          if (state.verificationId == null) {
            emit(state.copyWith(verificationId: verificationId));
          }
        },
        verificationFailed: (e) {
          emit(state.copyWith(isLoading: false, error: e.message ?? 'OTP failed'));
        },
      );
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> verifyPhoneOtp(String smsCode) async {
    final id = state.verificationId;
    if (id == null) {
      emit(state.copyWith(error: 'No OTP request in progress'));
      return;
    }
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      final credential = auth.PhoneAuthProvider.credential(
        verificationId: id,
        smsCode: smsCode,
      );
      await _auth.signInWithCredential(credential);
    } on auth.FirebaseAuthException catch (e) {
      emit(state.copyWith(isLoading: false, error: e.message ?? 'Invalid code'));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> sendPasswordReset(String email) async {
    emit(state.copyWith(isLoading: true, clearError: true));
    try {
      await _auth.sendPasswordResetEmail(email: email);
      emit(state.copyWith(isLoading: false));
    } on auth.FirebaseAuthException catch (e) {
      emit(state.copyWith(isLoading: false, error: e.message ?? 'Reset failed'));
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

  Future<void> markProfileComplete() async {
    final u = state.appUser;
    if (u == null) return;
    final updated = AppUser(
      uid: u.uid,
      email: u.email,
      phoneNumber: u.phoneNumber,
      displayName: u.displayName,
      photoURL: u.photoURL,
      role: u.role,
      phoneVerified: u.phoneVerified,
      shopVerified: u.shopVerified,
      status: u.status,
      fcmToken: u.fcmToken,
      createdAt: u.createdAt,
      updatedAt: DateTime.now(),
    );
    await updateAppUser(updated);
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  void clearError() {
    emit(state.copyWith(clearError: true));
  }

  @override
  Future<void> close() {
    _userSub?.cancel();
    return super.close();
  }
}
