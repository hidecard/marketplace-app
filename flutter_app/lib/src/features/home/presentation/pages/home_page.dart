import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../products/presentation/cubit/products_cubit.dart';
import '../../../shared/models/models.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Marketplace'),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () => context.push('/notifications')),
          IconButton(icon: const Icon(Icons.shopping_cart_outlined), onPressed: () => context.push('/cart')),
        ],
      ),
      body: BlocBuilder<ProductsCubit, ProductsState>(
        builder: (context, state) {
          return BlocBuilder<CategoriesCubit, CategoriesState>(
            builder: (context, catState) {
              return RefreshIndicator(
                onRefresh: () async {
                  context.read<ProductsCubit>().loadAll();
                },
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _SearchBar(),
                    const SizedBox(height: 16),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Categories', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 90,
                      child: catState.isLoading
                          ? const Center(child: CircularProgressIndicator())
                          : ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemCount: catState.categories.length,
                              separatorBuilder: (_, __) => const SizedBox(width: 12),
                              itemBuilder: (_, i) => _CategoryTile(catState.categories[i]),
                            ),
                    ),
                    const SizedBox(height: 16),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Featured Products', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (state.isLoading)
                      const Center(
                          child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
                    else if (state.products.isEmpty)
                      const EmptyState(icon: Icons.inventory_outlined, title: 'No products yet')
                    else
                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.7,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: state.products.length.clamp(0, 6),
                        itemBuilder: (_, i) => ProductCard(product: state.products[i]),
                      ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.push('/search'),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(12)),
        child: Row(
          children: [
            const Icon(Icons.search, color: Colors.grey),
            const SizedBox(width: 8),
            Text('Search products...', style: TextStyle(color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final Category category;
  const _CategoryTile(this.category);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/category/${category.id}'),
      child: SizedBox(
        width: 70,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.category, color: Theme.of(context).colorScheme.primary),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              style: const TextStyle(fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}