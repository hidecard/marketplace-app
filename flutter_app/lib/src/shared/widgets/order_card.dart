import 'package:flutter/material.dart';
import '../../features/shared/models/models.dart';

class OrderCard extends StatelessWidget {
  final Order order;
  final VoidCallback onTap;

  const OrderCard({super.key, required this.order, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('#${order.orderNumber}', style: const TextStyle(fontWeight: FontWeight.w600)),
                   Container(
                     padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                     decoration: BoxDecoration(
                       color: _statusColor(order.status),
                       borderRadius: BorderRadius.circular(4),
                     ),
                     child: Text(order.status.name, style: const TextStyle(color: Colors.white, fontSize: 12)),
                   ),
                ],
              ),
              const SizedBox(height: 8),
              Text('${order.items.length} items', style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 4),
              Text('${order.total} Ks', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB))),
            ],
          ),
        ),
      ),
    );
  }

  Color _statusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.confirmed:
      case OrderStatus.preparing:
        return Colors.blue;
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return Colors.indigo;
      case OrderStatus.delivered:
      case OrderStatus.completed:
        return Colors.green;
      case OrderStatus.cancelled:
      case OrderStatus.rejected:
        return Colors.red;
    }
  }
}
