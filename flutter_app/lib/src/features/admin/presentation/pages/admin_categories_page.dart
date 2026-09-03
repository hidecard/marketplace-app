import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminCategoriesPage extends StatelessWidget {
  const AdminCategoriesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Categories'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showForm(context),
          ),
        ],
      ),
      body: BlocBuilder<CategoriesCubit, CategoriesState>(
        builder: (context, state) {
          if (state.isLoading) return const Center(child: CircularProgressIndicator());
          if (state.categories.isEmpty) return const EmptyState(icon: Icons.category_outlined, title: 'No categories found');
          return ListView.builder(
            itemCount: state.categories.length,
            itemBuilder: (_, i) {
              final c = state.categories[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.category),
                  title: Text(c.name),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                        onPressed: () => _showForm(context, category: c),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text('Delete Category'),
                              content: Text('Delete "${c.name}"?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                              ],
                            ),
                          );
                          if (confirm == true) {
                            await context.read<CategoriesCubit>().delete(c.id);
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Category deleted')));
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showForm(BuildContext context, {Category? category}) {
    final nameCtrl = TextEditingController(text: category?.name ?? '');
    final slugCtrl = TextEditingController(text: category?.slug ?? '');
    final iconCtrl = TextEditingController(text: category?.icon ?? '');
    final parentCtrl = TextEditingController(text: category?.parentId ?? '');
    final orderCtrl = TextEditingController(text: '${category?.order ?? 0}');
    final cubit = context.read<CategoriesCubit>();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(category == null ? 'Add Category' : 'Edit Category'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
              TextField(controller: slugCtrl, decoration: const InputDecoration(labelText: 'Slug')),
              TextField(controller: iconCtrl, decoration: const InputDecoration(labelText: 'Icon (optional)')),
              TextField(controller: parentCtrl, decoration: const InputDecoration(labelText: 'Parent ID (optional)')),
              TextField(controller: orderCtrl, decoration: const InputDecoration(labelText: 'Order'), keyboardType: TextInputType.number),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final cat = Category(
                id: category?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                name: nameCtrl.text.trim(),
                slug: slugCtrl.text.trim(),
                icon: iconCtrl.text.trim().isEmpty ? null : iconCtrl.text.trim(),
                parentId: parentCtrl.text.trim().isEmpty ? null : parentCtrl.text.trim(),
                order: int.tryParse(orderCtrl.text.trim()) ?? 0,
              );
              if (category == null) {
                await cubit.create(cat);
              } else {
                await cubit.update(cat);
              }
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(category == null ? 'Category created' : 'Category updated')));
              }
            },
            child: Text(category == null ? 'Create' : 'Update'),
          ),
        ],
      ),
    );
  }
}
