import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminProductsPage extends StatelessWidget {
  const AdminProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    final fmt = NumberFormat.currency(symbol: '', decimalDigits: 0);
    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
      body: StreamBuilder<List<Product>>(
        stream: fs.allProductsStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final products = snap.data!;
          if (products.isEmpty) return const EmptyState(icon: Icons.inventory_outlined, title: 'No products found');
          return ListView.builder(
            itemCount: products.length,
            itemBuilder: (_, i) {
              final p = products[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.inventory),
                  title: Text(p.title),
                  subtitle: Text('${fmt.format(p.price)} • Stock: ${p.stock}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Chip(label: Text(productStatusToString(p.status))),
                      IconButton(
                        icon: Icon(p.status == ProductStatus.hidden ? Icons.visibility_off : Icons.visibility, color: Colors.orange),
                        onPressed: () async {
                          final newStatus = p.status == ProductStatus.hidden ? ProductStatus.active : ProductStatus.hidden;
                          final updated = Product(
                            id: p.id,
                            shopId: p.shopId,
                            sellerId: p.sellerId,
                            title: p.title,
                            description: p.description,
                            price: p.price,
                            comparePrice: p.comparePrice,
                            costPrice: p.costPrice,
                            categoryId: p.categoryId,
                            images: p.images,
                            condition: p.condition,
                            stock: p.stock,
                            sku: p.sku,
                            barcode: p.barcode,
                            weight: p.weight,
                            status: newStatus,
                            views: p.views,
                            createdAt: p.createdAt,
                            updatedAt: DateTime.now(),
                          );
                          await fs.updateProduct(updated);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(newStatus == ProductStatus.hidden ? 'Product hidden' : 'Product visible')));
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text('Delete Product'),
                              content: const Text('Are you sure you want to delete this product?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                              ],
                            ),
                          );
                          if (confirm == true) {
                            await fs.deleteProduct(p.id);
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Product deleted')));
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
}
