import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../orders/presentation/cubit/orders_cubit.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/order_card.dart';

class OrdersPage extends StatefulWidget {
  const OrdersPage({super.key});

  @override
  State<OrdersPage> createState() => _OrdersPageState();
}

class _OrdersPageState extends State<OrdersPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) return;
      final auth = context.read<AuthCubit>().state;
      final uid = auth.firebaseUser?.uid;
      final shopId = auth.shop?.id;
      if (_tabController.index == 0 && uid != null) {
        context.read<OrdersCubit>().loadForBuyer(uid);
      } else if (_tabController.index == 1 && shopId != null) {
        context.read<OrdersCubit>().loadForShop(shopId);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthCubit>().state;
    final uid = auth.firebaseUser?.uid;
    final shopId = auth.shop?.id;
    final showSeller = shopId != null;

    if (uid != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted && context.read<OrdersCubit>().state.orders.isEmpty) {
          context.read<OrdersCubit>().loadForBuyer(uid);
        }
      });
    }

    return DefaultTabController(
      length: showSeller ? 2 : 1,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Orders'),
          bottom: showSeller
              ? TabBar(
                  controller: _tabController,
                  tabs: const [Tab(text: 'Buyer'), Tab(text: 'Seller')],
                )
              : null,
        ),
        body: showSeller
            ? TabBarView(
                controller: _tabController,
                children: [
                  _OrdersTab(userId: uid, isBuyer: true),
                  _OrdersTab(userId: shopId, isBuyer: false),
                ],
              )
            : _OrdersTab(userId: uid, isBuyer: true),
      ),
    );
  }
}

class _OrdersTab extends StatelessWidget {
  final String? userId;
  final bool isBuyer;

  const _OrdersTab({required this.userId, required this.isBuyer});

  @override
  Widget build(BuildContext context) {
    if (userId == null) {
      return const Center(child: Text('Sign in to view orders'));
    }

    return BlocBuilder<OrdersCubit, OrdersState>(
      builder: (context, state) {
        return RefreshIndicator(
          onRefresh: () async {
            if (isBuyer) {
              context.read<OrdersCubit>().loadForBuyer(userId!);
            } else {
              context.read<OrdersCubit>().loadForShop(userId!);
            }
          },
          child: state.isLoading && state.orders.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : state.orders.isEmpty
                  ? const EmptyState(icon: Icons.receipt_long_outlined, title: 'No orders yet')
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: state.orders.length,
                      itemBuilder: (_, i) {
                        final order = state.orders[i];
                        return OrderCard(
                          order: order,
                          onTap: () => context.push('/orders/${order.id}'),
                        );
                      },
                    ),
        );
      },
    );
  }
}
