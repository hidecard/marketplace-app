import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../business/presentation/cubit/shops_cubit.dart';
import '../../../products/presentation/cubit/products_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ShopDetailPage extends StatelessWidget {
  final String shopId;
  const ShopDetailPage({super.key, required this.shopId});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ShopsCubit()),
        BlocProvider(create: (_) => ProductsCubit()..loadByShop(shopId)),
      ],
      child: _ShopDetailBody(shopId: shopId),
    );
  }
}

class _ShopDetailBody extends StatelessWidget {
  final String shopId;
  const _ShopDetailBody({required this.shopId});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return Scaffold(
      appBar: AppBar(title: const Text('Shop')),
      body: StreamBuilder<Shop?>(
        stream: fs.shopStream(shopId),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return const Center(child: Text('Error loading shop'));
          }
          final shop = snapshot.data;
          if (shop == null) {
            return const Center(child: CircularProgressIndicator());
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                color: Theme.of(context).primaryColor,
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      shop.name,
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${shop.city} • ${shop.rating.toStringAsFixed(1)} ★',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: BlocBuilder<ProductsCubit, ProductsState>(
                  builder: (context, state) {
                    if (state.isLoading) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (state.products.isEmpty) {
                      return const EmptyState(
                        icon: Icons.inventory_2_outlined,
                        title: 'No products yet',
                      );
                    }
                    return GridView.builder(
                      padding: const EdgeInsets.all(12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.72,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: state.products.length,
                      itemBuilder: (_, i) => ProductCard(product: state.products[i]),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}