import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/cubit/auth_cubit.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/products/presentation/pages/search_page.dart';
import '../../features/categories/presentation/pages/categories_page.dart';
import '../../features/categories/presentation/pages/category_detail_page.dart';
import '../../features/product/presentation/pages/product_detail_page.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/cart/presentation/pages/checkout_page.dart';
import '../../features/orders/presentation/pages/orders_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/chat/presentation/pages/chats_page.dart';
import '../../features/chat/presentation/pages/chat_detail_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/addresses_page.dart';
import '../../features/profile/presentation/pages/phone_verification_page.dart';
import '../../features/profile/presentation/pages/favorites_page.dart';
import '../../features/profile/presentation/pages/notifications_page.dart';
import '../../features/profile/presentation/pages/write_review_page.dart';
import '../../features/profile/presentation/pages/report_page.dart';
import '../../features/profile/presentation/pages/help_support_page.dart';
import '../../features/profile/presentation/pages/offers_page.dart';
import '../../features/profile/presentation/pages/create_offer_page.dart';
import '../../features/business/presentation/pages/business_dashboard_page.dart';
import '../../features/business/presentation/pages/pos_page.dart';
import '../../features/business/presentation/pages/products_page.dart';
import '../../features/business/presentation/pages/product_form_page.dart';
import '../../features/business/presentation/pages/business_orders_page.dart';
import '../../features/business/presentation/pages/analytics_page.dart';
import '../../features/business/presentation/pages/reports_page.dart';
import '../../features/business/presentation/pages/expenses_page.dart';
import '../../features/business/presentation/pages/inventory_movements_page.dart';
import '../../features/business/presentation/pages/customers_page.dart';
import '../../features/business/presentation/pages/business_categories_page.dart';
import '../../features/business/presentation/pages/business_settings_page.dart';
import '../../features/business/presentation/pages/verification_page.dart';
import '../../features/business/presentation/pages/create_shop_page.dart';
import '../../features/admin/presentation/pages/admin_dashboard_page.dart';
import '../../features/admin/presentation/pages/admin_users_page.dart';
import '../../features/admin/presentation/pages/admin_shops_page.dart';
import '../../features/admin/presentation/pages/admin_products_page.dart';
import '../../features/admin/presentation/pages/admin_orders_page.dart';
import '../../features/admin/presentation/pages/admin_verifications_page.dart';
import '../../features/admin/presentation/pages/admin_reports_page.dart';
import '../../features/admin/presentation/pages/admin_categories_page.dart';
import '../../features/admin/presentation/pages/admin_banners_page.dart';
import '../../features/admin/presentation/pages/admin_settings_page.dart';
import '../../features/admin/presentation/pages/admin_login_page.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) {
    final authState = context.read<AuthCubit>().state;
    final loc = state.matchedLocation;
    final isAuthRoute = loc == '/login' || loc == '/admin/login';

    if (!authState.isAuthenticated && !isAuthRoute) {
      return '/login';
    }
    if (authState.isAuthenticated) {
      if (loc == '/login') {
        return authState.isAdmin ? '/admin' : '/';
      }
      if (loc == '/admin/login' && authState.isAdmin) {
        return '/admin';
      }
      if (loc == '/admin' && !authState.isAdmin) {
        return '/';
      }
      if (loc.startsWith('/admin') && loc != '/admin/login' && !authState.isAdmin) {
        return '/';
      }
    }
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, _) => const LoginPage()),
    GoRoute(path: '/admin/login', builder: (_, _) => const AdminLoginPage()),
    GoRoute(path: '/', builder: (_, _) => const HomePage()),
    GoRoute(path: '/search', builder: (_, _) => const SearchPage()),
    GoRoute(path: '/categories', builder: (_, _) => const CategoriesPage()),
    GoRoute(path: '/category/:id', builder: (_, s) => CategoryDetailPage(categoryId: s.pathParameters['id']!)),
    GoRoute(path: '/product/:id', builder: (_, s) => ProductDetailPage(productId: s.pathParameters['id']!)),
    GoRoute(path: '/cart', builder: (_, _) => const CartPage()),
    GoRoute(path: '/checkout', builder: (_, _) => const CheckoutPage()),
    GoRoute(path: '/orders', builder: (_, _) => const OrdersPage()),
    GoRoute(path: '/orders/:id', builder: (_, s) => OrderDetailPage(orderId: s.pathParameters['id']!)),
    GoRoute(path: '/chats', builder: (_, _) => const ChatsPage()),
    GoRoute(path: '/chats/:id', builder: (_, s) => ChatDetailPage(chatId: s.pathParameters['id']!)),
    GoRoute(path: '/profile', builder: (_, _) => const ProfilePage()),
    GoRoute(path: '/addresses', builder: (_, _) => const AddressesPage()),
    GoRoute(path: '/verify-phone', builder: (_, _) => const PhoneVerificationPage()),
    GoRoute(path: '/favorites', builder: (_, _) => const FavoritesPage()),
    GoRoute(path: '/notifications', builder: (_, _) => const NotificationsPage()),
    GoRoute(path: '/help', builder: (_, _) => const HelpSupportPage()),
    GoRoute(path: '/offers', builder: (_, _) => const OffersPage()),
    GoRoute(
      path: '/offers/create/:productId',
      builder: (_, s) => CreateOfferPage(productId: s.pathParameters['productId']!),
    ),
    GoRoute(
      path: '/review/:productId/:shopId/:orderId',
      builder: (_, s) => WriteReviewPage(
        productId: s.pathParameters['productId']!,
        shopId: s.pathParameters['shopId']!,
        orderId: s.pathParameters['orderId']!,
      ),
    ),
    GoRoute(
      path: '/report/:type/:id',
      builder: (_, s) => ReportPage(
        targetType: s.pathParameters['type']!,
        targetId: s.pathParameters['id']!,
      ),
    ),
    GoRoute(path: '/business', builder: (_, _) => const BusinessDashboardPage()),
    GoRoute(path: '/business/create-shop', builder: (_, _) => const CreateShopPage()),
    GoRoute(path: '/business/pos', builder: (_, _) => const POSPage()),
    GoRoute(path: '/business/products', builder: (_, _) => const BusinessProductsPage()),
    GoRoute(path: '/business/products/new', builder: (_, _) => const ProductFormPage()),
    GoRoute(
      path: '/business/products/:id',
      builder: (_, s) => ProductFormPage(productId: s.pathParameters['id']),
    ),
    GoRoute(path: '/business/orders', builder: (_, _) => const BusinessOrdersPage()),
    GoRoute(path: '/business/analytics', builder: (_, _) => const AnalyticsPage()),
    GoRoute(path: '/business/reports', builder: (_, _) => const ReportsPage()),
    GoRoute(path: '/business/expenses', builder: (_, _) => const ExpensesPage()),
    GoRoute(path: '/business/inventory', builder: (_, _) => const InventoryMovementsPage()),
    GoRoute(path: '/business/customers', builder: (_, _) => const CustomersPage()),
    GoRoute(path: '/business/categories', builder: (_, _) => const BusinessCategoriesPage()),
    GoRoute(path: '/business/settings', builder: (_, _) => const BusinessSettingsPage()),
    GoRoute(path: '/business/verification', builder: (_, _) => const VerificationPage()),
    GoRoute(path: '/admin', builder: (_, _) => const AdminDashboardPage()),
    GoRoute(path: '/admin/users', builder: (_, _) => const AdminUsersPage()),
    GoRoute(path: '/admin/shops', builder: (_, _) => const AdminShopsPage()),
    GoRoute(path: '/admin/products', builder: (_, _) => const AdminProductsPage()),
    GoRoute(path: '/admin/orders', builder: (_, _) => const AdminOrdersPage()),
    GoRoute(path: '/admin/verifications', builder: (_, _) => const AdminVerificationsPage()),
    GoRoute(path: '/admin/reports', builder: (_, _) => const AdminReportsPage()),
    GoRoute(path: '/admin/categories', builder: (_, _) => const AdminCategoriesPage()),
    GoRoute(path: '/admin/banners', builder: (_, _) => const AdminBannersPage()),
    GoRoute(path: '/admin/settings', builder: (_, _) => const AdminSettingsPage()),
  ],
);