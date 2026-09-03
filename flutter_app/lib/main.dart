import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'src/core/constants/app_constants.dart';
import 'src/core/theme/app_theme.dart';
import 'src/features/auth/presentation/cubit/auth_cubit.dart';
import 'src/features/products/presentation/cubit/products_cubit.dart';
import 'src/features/categories/presentation/cubit/categories_cubit.dart';
import 'src/features/cart/presentation/cubit/cart_cubit.dart';
import 'src/features/orders/presentation/cubit/orders_cubit.dart';
import 'src/features/chat/presentation/cubit/chat_cubit.dart';
import 'src/features/business/presentation/cubit/business_cubit.dart';
import 'src/features/pos/presentation/cubit/pos_cubit.dart';
import 'src/features/expenses/presentation/cubit/expenses_cubit.dart';
import 'src/features/inventory/presentation/cubit/inventory_cubit.dart';
import 'src/features/customers/presentation/cubit/customers_cubit.dart';
import 'src/features/reports/presentation/cubit/reports_cubit.dart';
import 'src/core/router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: const FirebaseOptions(
      apiKey: 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo',
      authDomain: 'padaytharpin-app.firebaseapp.com',
      projectId: 'padaytharpin-app',
      storageBucket: 'padaytharpin-app.firebasestorage.app',
      messagingSenderId: '304535507982',
      appId: '1:304535507982:web:b960bdb0f2bc1652fb985f',
      measurementId: 'G-F7JE4SNWDC',
    ),
  );
  runApp(const MarketplaceApp());
}

class MarketplaceApp extends StatelessWidget {
  const MarketplaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => AuthCubit()..checkAuthStatus()),
        BlocProvider(create: (_) => ProductsCubit()),
        BlocProvider(create: (_) => CategoriesCubit()),
        BlocProvider(create: (_) => CartCubit()),
        BlocProvider(create: (_) => OrdersCubit()),
        BlocProvider(create: (_) => ChatCubit()),
        BlocProvider(create: (_) => BusinessCubit()),
        BlocProvider(create: (_) => POSCubit()),
        BlocProvider(create: (_) => ExpensesCubit()),
        BlocProvider(create: (_) => InventoryCubit()),
        BlocProvider(create: (_) => CustomersCubit()),
        BlocProvider(create: (_) => ReportsCubit()),
      ],
      child: MaterialApp.router(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        routerConfig: appRouter,
      ),
    );
  }
}