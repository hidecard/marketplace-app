import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../products/presentation/cubit/products_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../../shared/widgets/empty_state.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _queryController = TextEditingController();
  String? _selectedCategory;
  ProductCondition? _selectedCondition;
  final _minController = TextEditingController();
  final _maxController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<ProductsCubit>().loadAll();
    context.read<CategoriesCubit>().load();
  }

  @override
  void dispose() {
    _queryController.dispose();
    _minController.dispose();
    _maxController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    final cubit = context.read<ProductsCubit>();
    final query = _queryController.text.trim();
    if (query.isNotEmpty) {
      cubit.search(query);
    } else {
      cubit.loadAll();
    }
    if (_selectedCategory != null) {
      cubit.loadByCategory(_selectedCategory!);
    }
    if (_selectedCondition != null) {
      cubit.setCondition(_selectedCondition);
    }
    final min = double.tryParse(_minController.text.trim());
    final max = double.tryParse(_maxController.text.trim());
    if (min != null || max != null) {
      cubit.setPriceRange(min, max);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _queryController,
          decoration: const InputDecoration(hintText: 'Search products...', border: InputBorder.none),
          onChanged: (_) => _applyFilters(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                builder: (_) => Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                       BlocBuilder<CategoriesCubit, CategoriesState>(
                        builder: (context, catState) {
                          return DropdownButtonFormField<String>(
                            value: _selectedCategory,
                            decoration: const InputDecoration(labelText: 'Category'),
                            items: [
                              const DropdownMenuItem(value: null, child: Text('All')),
                              ...catState.categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))),
                            ],
                            onChanged: (v) => setState(() => _selectedCategory = v),
                          );
                        },
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<ProductCondition>(
                        value: _selectedCondition,
                        decoration: const InputDecoration(labelText: 'Condition'),
                        items: const [
                          DropdownMenuItem(value: null, child: Text('All')),
                          DropdownMenuItem(value: ProductCondition.newCondition, child: Text('New')),
                          DropdownMenuItem(value: ProductCondition.used, child: Text('Used')),
                          DropdownMenuItem(value: ProductCondition.refurbished, child: Text('Refurbished')),
                        ],
                        onChanged: (v) => setState(() => _selectedCondition = v),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _minController,
                              decoration: const InputDecoration(labelText: 'Min Price'),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _maxController,
                              decoration: const InputDecoration(labelText: 'Max Price'),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          _applyFilters();
                          Navigator.pop(context);
                        },
                        child: const Text('Apply'),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: BlocBuilder<ProductsCubit, ProductsState>(
        builder: (context, state) {
          if (state.isLoading && state.products.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.products.isEmpty) {
            return const EmptyState(icon: Icons.search_off_outlined, title: 'No products found');
          }
          return RefreshIndicator(
            onRefresh: () async => _applyFilters(),
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
