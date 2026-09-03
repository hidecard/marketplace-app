import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class CreateOfferPage extends StatefulWidget {
  final String productId;
  const CreateOfferPage({super.key, required this.productId});

  @override
  State<CreateOfferPage> createState() => _CreateOfferPageState();
}

class _CreateOfferPageState extends State<CreateOfferPage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _price = TextEditingController();
  final FirestoreService _fs = FirestoreService();
  Product? _product;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _fs.getProduct(widget.productId).then((p) {
      if (mounted) setState(() => _product = p);
    });
  }

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final user = context.read<AuthCubit>().state.appUser;
    if (user == null || _product == null) {
      setState(() => _submitting = false);
      return;
    }
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final offer = Offer(
      id: id,
      productId: widget.productId,
      buyerId: user.uid,
      sellerId: _product!.sellerId.isNotEmpty ? _product!.sellerId : _product!.shopId,
      price: double.tryParse(_price.text.trim()) ?? 0,
    );
    try {
      await _fs.createOffer(offer);
      final chatId = await _fs.createOrGetChat(
        [user.uid, offer.sellerId],
        productId: widget.productId,
      );
      await _fs.sendMessage(
        chatId: chatId,
        senderId: user.uid,
        content: 'Offer: ${offer.price.toStringAsFixed(0)} Ks',
        type: MessageType.offer,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Offer sent')));
        context.go('/chats/$chatId');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: '', decimalDigits: 0);
    return Scaffold(
      appBar: AppBar(title: const Text('Make an Offer')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_product != null)
                Card(
                  child: ListTile(
                    leading: _product!.images.isNotEmpty
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: Image.network(_product!.images.first, width: 56, height: 56, fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Container(width: 56, height: 56, color: Colors.grey[200], child: const Icon(Icons.image))),
                          )
                        : const Icon(Icons.image, size: 56),
                    title: Text(_product!.title, maxLines: 2, overflow: TextOverflow.ellipsis),
                    subtitle: Text('${fmt.format(_product!.price)} Ks',
                        style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold)),
                  ),
                ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Your offer price (Ks)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.local_offer_outlined),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Enter a price';
                  final n = double.tryParse(v.trim());
                  if (n == null || n <= 0) return 'Invalid price';
                  return null;
                },
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
                label: const Text('Submit Offer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}