import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../cart/presentation/cubit/cart_cubit.dart';
import '../../../orders/presentation/cubit/orders_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class CheckoutPage extends StatefulWidget {
  const CheckoutPage({super.key});

  @override
  State<CheckoutPage> createState() => _CheckoutPageState();
}

class _CheckoutPageState extends State<CheckoutPage> {
  final FirestoreService _fs = FirestoreService();
  final _formKey = GlobalKey<FormState>();
  List<Address> _addresses = [];
  Address? _selectedAddress;
  PaymentMethod _paymentMethod = PaymentMethod.cash;
  bool _isPlacing = false;
  final _noteController = TextEditingController();
  final _labelController = TextEditingController();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addrController = TextEditingController();
  final _cityController = TextEditingController();
  final _regionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  @override
  void dispose() {
    _noteController.dispose();
    _labelController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _addrController.dispose();
    _cityController.dispose();
    _regionController.dispose();
    super.dispose();
  }

  Future<void> _loadAddresses() async {
    final auth = context.read<AuthCubit>().state;
    final uid = auth.firebaseUser?.uid;
    if (uid == null) return;
    final addrs = await _fs.addressesStream(uid).first;
    if (mounted) setState(() => _addresses = addrs);
    if (addrs.any((a) => a.isDefault)) {
      setState(() => _selectedAddress = addrs.firstWhere((a) => a.isDefault));
    } else if (addrs.isNotEmpty) {
      setState(() => _selectedAddress = addrs.first);
    }
  }

  Future<void> _placeOrder() async {
    if (_selectedAddress == null && !_formKey.currentState!.validate()) return;
    final auth = context.read<AuthCubit>().state;
    final user = auth.firebaseUser;
    final shop = auth.shop;
    final cart = context.read<CartCubit>().state;
    if (user == null || cart.items.isEmpty) return;

    setState(() => _isPlacing = true);
    try {
      Address shipping;
      if (_selectedAddress != null) {
        shipping = _selectedAddress!;
      } else {
        shipping = Address(
          id: user.uid,
          userId: user.uid,
          label: _labelController.text.trim(),
          name: _nameController.text.trim(),
          phone: _phoneController.text.trim(),
          address: _addrController.text.trim(),
          city: _cityController.text.trim(),
          region: _regionController.text.trim(),
        );
        await _fs.addAddress(user.uid, shipping);
      }

      final subtotal = cart.subtotal;
      const delivery = 500.0;
      const discount = 0.0;
      final total = subtotal + delivery - discount;
      final items = cart.items
          .map((i) => OrderItem(
                productId: i.productId,
                title: i.title,
                image: i.image,
                price: i.price,
                quantity: i.quantity,
                subtotal: i.subtotal,
              ))
          .toList();

      final order = Order(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        orderNumber: 'ORD-${DateTime.now().millisecondsSinceEpoch}',
        buyerId: user.uid,
        shopId: shop?.id ?? '',
        items: items,
        subtotal: subtotal,
        deliveryFee: delivery,
        discount: discount,
        total: total,
        paymentMethod: _paymentMethod,
        paymentStatus: PaymentStatus.pending,
        status: OrderStatus.pending,
        shippingAddress: shipping,
        note: _noteController.text.trim().isEmpty ? null : _noteController.text.trim(),
      );

      await _placeOrderInternal(order);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isPlacing = false);
    }
  }

  Future<void> _placeOrderInternal(Order order) async {
    await context.read<OrdersCubit>().create(order);
    await context.read<CartCubit>().clear();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed successfully')));
      context.go('/orders');
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartCubit>().state;
    final subtotal = cart.subtotal;
    const delivery = 500.0;
    const discount = 0.0;
    final total = subtotal + delivery - discount;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: _isPlacing
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  if (_addresses.isEmpty)
                    Column(
                      children: [
                        TextFormField(
                          controller: _labelController,
                          decoration: const InputDecoration(labelText: 'Label (e.g. Home)'),
                          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                        TextFormField(
                          controller: _nameController,
                          decoration: const InputDecoration(labelText: 'Full Name'),
                          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                        TextFormField(
                          controller: _phoneController,
                          decoration: const InputDecoration(labelText: 'Phone'),
                          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                        TextFormField(
                          controller: _addrController,
                          decoration: const InputDecoration(labelText: 'Address'),
                          validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                        ),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _cityController,
                                decoration: const InputDecoration(labelText: 'City'),
                                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: TextFormField(
                                controller: _regionController,
                                decoration: const InputDecoration(labelText: 'Region'),
                                validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                              ),
                            ),
                          ],
                        ),
                      ],
                    )
                  else
                    Column(
                      children: _addresses
                          .map(
                            (a) => RadioListTile<Address>(
                              value: a,
                              groupValue: _selectedAddress,
                              title: Text(a.label),
                              subtitle: Text('${a.name} \u00b7 ${a.phone}\n${a.address}, ${a.city}, ${a.region}'),
                              onChanged: (v) => setState(() => _selectedAddress = v),
                            ),
                          )
                          .toList(),
                    ),
                  const SizedBox(height: 24),
                  const Text('Payment Method', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 12,
                    children: [
                      ...PaymentMethod.values.map((m) {
                        final label = switch (m) {
                          PaymentMethod.cash => 'Cash',
                          PaymentMethod.kbzpay => 'KBZ Pay',
                          PaymentMethod.wavepay => 'Wave Pay',
                          PaymentMethod.bankTransfer => 'Bank Transfer',
                          PaymentMethod.cod => 'COD',
                          PaymentMethod.other => 'Other',
                        };
                        return ChoiceChip(
                          label: Text(label),
                          selected: _paymentMethod == m,
                          onSelected: (_) => setState(() => _paymentMethod = m),
                        );
                      }),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text('Order Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _SummaryRow(label: 'Subtotal', value: '$subtotal Ks'),
                          const SizedBox(height: 8),
                          _SummaryRow(label: 'Delivery', value: '$delivery Ks'),
                          const SizedBox(height: 8),
                          _SummaryRow(label: 'Discount', value: '-$discount Ks'),
                          const Divider(),
                          _SummaryRow(label: 'Total', value: '$total Ks', isBold: true),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _noteController,
                    decoration: const InputDecoration(labelText: 'Note (optional)'),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _placeOrder,
                      style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.primary, foregroundColor: Colors.white),
                      child: const Text('Place Order'),
                    ),
                  ),
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
