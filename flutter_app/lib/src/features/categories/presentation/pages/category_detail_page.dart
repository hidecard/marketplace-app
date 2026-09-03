import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../products/presentation/cubit/products_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../shared/widgets/empty_state.dart';

class CategoryDetailPage extends StatefulWidget {
  final String categoryId;

  const CategoryDetailPage({super.key, required this.categoryId});

  @override
  State<CategoryDetailPage> createState() => _CategoryDetailPageState();
}

class _CategoryDetailPageState extends State<CategoryDetailPage> {
  Category? _category;

  @override
  void initState() {
    super.initState();
    _loadCategory();
    context.read<ProductsCubit>().loadByCategory(widget.categoryId);
  }

  void _loadCategory() {
    final cat = context.read<CategoriesCubit>().state.categories.firstWhere((c) => c.id == widget.categoryId, orElse: () => throw Exception('not found'));
    if (mounted) setState(() => _category = cat);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_category?.name ?? 'Category'),
      ),
      body: BlocBuilder<ProductsCubit, ProductsState>(
        builder: (context, state) {
          if (state.isLoading && state.products.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.products.isEmpty) {
            return const EmptyState(icon: Icons.inventory_outlined, title: 'No products in this category');
          }
          return RefreshIndicator(
            onRefresh: () async => context.read<ProductsCubit>().loadByCategory(widget.categoryId),
            child: GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.7,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: state.products.length,
              itemBuilder: (_, i) => ProductCard(product: state.products[i]),
            ),
          );
        },
      ),
    );
  }
}
