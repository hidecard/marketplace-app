import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../../shared/widgets/empty_state.dart';

class CategoriesPage extends StatelessWidget {
  const CategoriesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      body: BlocBuilder<CategoriesCubit, CategoriesState>(
        builder: (context, state) {
          if (state.isLoading && state.categories.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.categories.isEmpty) {
            return const EmptyState(icon: Icons.category_outlined, title: 'No categories yet');
          }
          return RefreshIndicator(
            onRefresh: () async {
              context.read<CategoriesCubit>().load();
            },
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: state.categories.length,
              itemBuilder: (_, i) {
                final cat = state.categories[i];
                return GestureDetector(
                  onTap: () => context.push('/category/${cat.id}'),
                  child: Card(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.category, size: 40, color: Theme.of(context).colorScheme.primary),
                          const SizedBox(height: 12),
                          Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
