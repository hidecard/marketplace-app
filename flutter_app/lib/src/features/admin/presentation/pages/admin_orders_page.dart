import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminOrdersPage extends StatelessWidget {
  const AdminOrdersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    final fmt = DateFormat('MMM dd, yyyy');
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: StreamBuilder<List<Order>>(
        stream: fs.allOrdersStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final orders = snap.data!;
          if (orders.isEmpty) return const EmptyState(icon: Icons.shopping_bag_outlined, title: 'No orders found');
          return ListView.builder(
            itemCount: orders.length,
            itemBuilder: (_, i) {
              final o = orders[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  title: Text('#${o.orderNumber}'),
                  subtitle: Text('${o.status.name} • ${fmt.format(o.createdAt ?? DateTime.now())}'),
                  trailing: Text(NumberFormat.currency(symbol: '', decimalDigits: 0).format(o.total)),
                  onTap: () => _showDetails(context, o),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showDetails(BuildContext context, Order o) {
    final fs = FirestoreService();
    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: Text('Order #${o.orderNumber}'),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Status: ${o.status.name}'),
                  Text('Total: ${NumberFormat.currency(symbol: '', decimalDigits: 0).format(o.total)}'),
                  const SizedBox(height: 12),
                  const Text('Update Status:', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: OrderStatus.values.map((s) {
                      final isSelected = o.status == s;
                      return ChoiceChip(
                        label: Text(orderStatusToString(s)),
                        selected: isSelected,
                        onSelected: (v) async {
                          if (v && !isSelected) {
                            await fs.updateOrderStatus(o.id, s);
                            setState(() {});
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Status updated to ${orderStatusToString(s)}')));
                            }
                          }
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
          );
        },
      ),
    );
  }
}
