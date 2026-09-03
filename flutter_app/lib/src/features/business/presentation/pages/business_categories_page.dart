import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/sidebar_drawer.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../shared/models/models.dart';

class BusinessCategoriesPage extends StatelessWidget {
  const BusinessCategoriesPage({super.key});

  Future<void> _edit(BuildContext context, [Category? existing]) async {
    final result = await showDialog<Category>(
      context: context,
      builder: (_) => _CategoryDialog(existing: existing),
    );
    if (result != null) {
      if (existing == null) {
        context.read<CategoriesCubit>().create(result);
      } else {
        context.read<CategoriesCubit>().update(result);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      drawer: const SidebarDrawer(currentRoute: '/business/categories'),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _edit(context),
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
      body: BlocBuilder<CategoriesCubit, CategoriesState>(
        builder: (context, state) {
          if (state.isLoading) return const Center(child: CircularProgressIndicator());
          if (state.categories.isEmpty) {
            return const EmptyState(icon: Icons.category_outlined, title: 'No categories');
          }
          return ListView.builder(
            itemCount: state.categories.length,
            itemBuilder: (_, i) {
              final c = state.categories[i];
              return ListTile(
                leading: const Icon(Icons.category),
                title: Text(c.name),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => context.read<CategoriesCubit>().delete(c.id),
                ),
                onTap: () => _edit(context, c),
              );
            },
          );
        },
      ),
    );
  }
}

class _CategoryDialog extends StatefulWidget {
  final Category? existing;
  const _CategoryDialog({this.existing});
  @override
  State<_CategoryDialog> createState() => _CategoryDialogState();
}

class _CategoryDialogState extends State<_CategoryDialog> {
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _order = TextEditingController(text: '0');

  @override
  void initState() {
    super.initState();
    if (widget.existing != null) {
      _name.text = widget.existing!.name;
      _slug.text = widget.existing!.slug;
      _order.text = widget.existing!.order.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.existing == null ? 'Add Category' : 'Edit Category'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _name,
            decoration: const InputDecoration(labelText: 'Name'),
            onChanged: (v) {
              if (widget.existing == null) _slug.text = v.toLowerCase().replaceAll(' ', '-');
            },
          ),
          TextField(controller: _slug, decoration: const InputDecoration(labelText: 'Slug')),
          TextField(
            controller: _order,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Order'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () {
            final id = widget.existing?.id ?? DateTime.now().millisecondsSinceEpoch.toString();
            Navigator.pop(
              context,
              Category(
                id: id,
                name: _name.text,
                slug: _slug.text,
                order: int.tryParse(_order.text) ?? 0,
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}