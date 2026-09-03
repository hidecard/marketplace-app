import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../orders/presentation/cubit/orders_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class OrderDetailPage extends StatefulWidget {
  final String orderId;

  const OrderDetailPage({super.key, required this.orderId});

  @override
  State<OrderDetailPage> createState() => _OrderDetailPageState();
}

class _OrderDetailPageState extends State<OrderDetailPage> {
  final FirestoreService _fs = FirestoreService();
  Order? _order;
  bool _isLoading = true;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    final order = await _fs.getOrder(widget.orderId);
    if (mounted) {
      setState(() {
        _order = order;
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus(OrderStatus status) async {
    if (_order == null) return;
    setState(() => _isUpdating = true);
    try {
      await context.read<OrdersCubit>().updateStatus(widget.orderId, status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order marked as ${orderStatusToString(status)}')),
        );
        _loadOrder();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdating = false);
    }
  }

  Color _statusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.confirmed:
        return Colors.blue;
      case OrderStatus.preparing:
        return Colors.purple;
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return Colors.indigo;
      case OrderStatus.delivered:
      case OrderStatus.completed:
        return Colors.green;
      case OrderStatus.cancelled:
        return Colors.red;
      case OrderStatus.rejected:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _isLoading ? const Text('Loading...') : Text('Order #${_order?.orderNumber ?? widget.orderId}'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _order == null
              ? const Center(child: Text('Order not found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Chip(
                            label: Text(orderStatusToString(_order!.status)),
                            backgroundColor: _statusColor(_order!.status).withValues(alpha: 0.2),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            DateFormat.yMMMd().add_jm().format(_order!.createdAt ?? DateTime.now()),
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                      const Text('Items', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      ..._order!.items.map((item) => _OrderItemTile(item: item)),
                      const SizedBox(height: 24),
                      _SummaryCard(
                        subtotal: _order!.subtotal,
                        deliveryFee: _order!.deliveryFee,
                        discount: _order!.discount,
                        total: _order!.total,
                      ),
                      const SizedBox(height: 24),
                      const Text('Shipping Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      _AddressCard(address: _order!.shippingAddress),
                      const SizedBox(height: 24),
                      const Text('Payment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      _PaymentInfoCard(
                        method: _order!.paymentMethod,
                        status: _order!.paymentStatus,
                      ),
                      if (_order!.note != null && _order!.note!.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        const Text('Note', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Text(_order!.note!),
                      ],
                      const SizedBox(height: 80),
                    ],
                  ),
                ),
      bottomNavigationBar: _order == null || _isUpdating
          ? null
          : _ActionBar(
              order: _order!,
              onUpdateStatus: _updateStatus,
            ),
    );
  }
}

class _OrderItemTile extends StatelessWidget {
  final OrderItem item;

  const _OrderItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: item.image.isNotEmpty
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(item.image, fit: BoxFit.cover, width: 56, height: 56),
                    )
                  : const Icon(Icons.image, color: Colors.grey),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('Qty: ${item.quantity}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                ],
              ),
            ),
            Text('${item.subtotal} Ks', style: const TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final double subtotal;
  final double deliveryFee;
  final double discount;
  final double total;

  const _SummaryCard({
    required this.subtotal,
    required this.deliveryFee,
    required this.discount,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _SummaryRow(label: 'Subtotal', value: '$subtotal Ks'),
            const SizedBox(height: 8),
            _SummaryRow(label: 'Delivery Fee', value: '$deliveryFee Ks'),
            const SizedBox(height: 8),
            _SummaryRow(label: 'Discount', value: '-$discount Ks'),
            const Divider(),
            _SummaryRow(label: 'Total', value: '$total Ks', isBold: true),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;

  const _SummaryRow({required this.label, required this.value, this.isBold = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(value, style: TextStyle(fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }
}

class _AddressCard extends StatelessWidget {
  final Address address;

  const _AddressCard({required this.address});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.location_on_outlined),
            const SizedBox(width: 12),
            Expanded(
              child: Text('${address.label}\n${address.name} · ${address.phone}\n${address.address}, ${address.city}, ${address.region}'),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentInfoCard extends StatelessWidget {
  final PaymentMethod method;
  final PaymentStatus status;

  const _PaymentInfoCard({required this.method, required this.status});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(_paymentIcon(method)),
            const SizedBox(width: 12),
            Expanded(
              child: Text('${_paymentLabel(method)} · ${paymentStatusToString(status)}'),
            ),
          ],
        ),
      ),
    );
  }

  String _paymentLabel(PaymentMethod method) {
    switch (method) {
      case PaymentMethod.cash:
        return 'Cash';
      case PaymentMethod.kbzpay:
        return 'KBZ Pay';
      case PaymentMethod.wavepay:
        return 'Wave Pay';
      case PaymentMethod.bankTransfer:
        return 'Bank Transfer';
      case PaymentMethod.cod:
        return 'COD';
      case PaymentMethod.other:
        return 'Other';
    }
  }

  IconData _paymentIcon(PaymentMethod method) {
    switch (method) {
      case PaymentMethod.cash:
        return Icons.money;
      case PaymentMethod.kbzpay:
        return Icons.payment;
      case PaymentMethod.wavepay:
        return Icons.phone_android;
      case PaymentMethod.bankTransfer:
        return Icons.account_balance;
      case PaymentMethod.cod:
        return Icons.local_shipping;
      case PaymentMethod.other:
        return Icons.payment;
    }
  }
}

class _ActionBar extends StatelessWidget {
  final Order order;
  final Future<void> Function(OrderStatus) onUpdateStatus;

  const _ActionBar({required this.order, required this.onUpdateStatus});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthCubit>().state;
    final isBuyer = auth.firebaseUser?.uid == order.buyerId;
    final isSeller = auth.shop?.id == order.shopId;

    final actions = <Widget>[];

    if (isSeller) {
      switch (order.status) {
        case OrderStatus.pending:
          actions.addAll([
            ElevatedButton.icon(
              onPressed: () => onUpdateStatus(OrderStatus.confirmed),
              icon: const Icon(Icons.check),
              label: const Text('Confirm'),
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              onPressed: () => onUpdateStatus(OrderStatus.cancelled),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
              icon: const Icon(Icons.close),
              label: const Text('Reject'),
            ),
          ]);
        case OrderStatus.confirmed:
          actions.add(
            ElevatedButton.icon(
              onPressed: () => onUpdateStatus(OrderStatus.preparing),
              icon: const Icon(Icons.pending),
              label: const Text('Start Processing'),
            ),
          );
        case OrderStatus.preparing:
          actions.add(
            ElevatedButton.icon(
              onPressed: () => onUpdateStatus(OrderStatus.shipped),
              icon: const Icon(Icons.local_shipping),
              label: const Text('Mark Shipped'),
            ),
          );
        case OrderStatus.shipped:
        case OrderStatus.outForDelivery:
          actions.add(
            ElevatedButton.icon(
              onPressed: () => onUpdateStatus(OrderStatus.delivered),
              icon: const Icon(Icons.check_circle),
              label: const Text('Mark Delivered'),
            ),
          );
        case OrderStatus.delivered:
        case OrderStatus.completed:
          break;
        case OrderStatus.cancelled:
        case OrderStatus.rejected:
          break;
      }
    }

    if (actions.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: actions,
        ),
      ),
    );
  }
}
