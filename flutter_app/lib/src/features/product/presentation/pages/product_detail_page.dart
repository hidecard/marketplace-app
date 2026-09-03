import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../cart/presentation/cubit/cart_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ProductDetailPage extends StatefulWidget {
  final String productId;

  const ProductDetailPage({super.key, required this.productId});

  @override
  State<ProductDetailPage> createState() => _ProductDetailPageState();
}

class _ProductDetailPageState extends State<ProductDetailPage> {
  final FirestoreService _fs = FirestoreService();
  Product? _product;
  bool _isLoading = true;
  int _qty = 1;
  bool _isFavorite = false;
  bool _isAddingToCart = false;

  @override
  void initState() {
    super.initState();
    _loadProduct();
  }

  Future<void> _loadProduct() async {
    final p = await _fs.getProduct(widget.productId);
    if (mounted) {
      setState(() {
        _product = p;
        _isLoading = false;
      });
    }
  }

  Future<void> _addToCart() async {
    if (_product == null) return;
    final auth = context.read<AuthCubit>().state;
    final user = auth.firebaseUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to add to cart')),
      );
      return;
    }
    setState(() => _isAddingToCart = true);
    try {
      final item = CartItem(
        productId: _product!.id,
        title: _product!.title,
        image: _product!.images.isNotEmpty ? _product!.images.first : '',
        price: _product!.price,
        quantity: _qty,
        shopId: _product!.shopId,
      );
      await context.read<CartCubit>().add(item);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Added to cart')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isAddingToCart = false);
    }
  }

  Future<void> _toggleFavorite() async {
    final auth = context.read<AuthCubit>().state;
    final user = auth.firebaseUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to favorite')),
      );
      return;
    }
    if (_isFavorite) {
      await _fs.removeFavorite(user.uid, widget.productId);
    } else {
      await _fs.addFavorite(user.uid, widget.productId);
    }
    setState(() => _isFavorite = !_isFavorite);
  }

  void _chatWithSeller() {
    final auth = context.read<AuthCubit>().state;
    final user = auth.firebaseUser;
    final shop = auth.shop;
    if (user == null || _product == null || shop == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to chat')),
      );
      return;
    }
    final sellerId = _product!.sellerId;
    if (sellerId == user.uid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot chat with yourself')),
      );
      return;
    }
    context.push('/chats');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _isLoading ? const Text('Loading...') : Text(_product?.title ?? 'Product Detail'),
        actions: [
          IconButton(
            icon: Icon(_isFavorite ? Icons.favorite : Icons.favorite_border),
            color: _isFavorite ? Colors.red : null,
            onPressed: _toggleFavorite,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _product == null
              ? const Center(child: Text('Product not found'))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _ImageGallery(images: _product!.images),
                            const SizedBox(height: 16),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _product!.title,
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Text(
                                        '${NumberFormat.currency(symbol: '', decimalDigits: 0).format(_product!.price)} Ks',
                                        style: TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context).colorScheme.primary,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.grey[200],
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          _product!.condition == ProductCondition.used
                                              ? 'Used'
                                              : _product!.condition == ProductCondition.refurbished
                                                  ? 'Refurbished'
                                                  : 'New',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'Description',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    _product!.description,
                                    style: TextStyle(color: Colors.grey[700], height: 1.5),
                                  ),
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      _InfoChip(label: 'Stock', value: '${_product!.stock}'),
                                      const SizedBox(width: 12),
                                      if (_product!.sku != null)
                                        _InfoChip(label: 'SKU', value: _product!.sku!),
                                    ],
                                  ),
                                  const SizedBox(height: 24),
                                  OutlinedButton.icon(
                                    onPressed: _chatWithSeller,
                                    icon: const Icon(Icons.chat_bubble_outline),
                                    label: const Text('Chat with seller'),
                                  ),
                                  const SizedBox(height: 80),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    Container(
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
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey[300]!),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  IconButton(
                                    onPressed: _qty > 1 ? () => setState(() => _qty--) : null,
                                    icon: const Icon(Icons.remove),
                                  ),
                                  Text('$_qty', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                                  IconButton(
                                    onPressed: _product!.stock > _qty
                                        ? () => setState(() => _qty++)
                                        : null,
                                    icon: const Icon(Icons.add),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child:                             ElevatedButton(
                              onPressed: _product!.stock > 0 && !_isAddingToCart
                                  ? _addToCart
                                  : null,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                foregroundColor: Colors.white,
                              ),
                              child: _isAddingToCart
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    )
                                  : Text(_product!.stock > 0 ? 'Add to Cart' : 'Out of Stock'),
                            ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _ImageGallery extends StatelessWidget {
  final List<String> images;

  const _ImageGallery({required this.images});

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) {
      return Container(
        height: 300,
        color: Colors.grey[200],
        child: const Icon(Icons.image, size: 80, color: Colors.grey),
      );
    }
    return SizedBox(
      height: 300,
      child: PageView.builder(
        itemCount: images.length,
        itemBuilder: (context, index) {
          return CachedNetworkImage(
            imageUrl: images[index],
            fit: BoxFit.cover,
            width: double.infinity,
            placeholder: (_, __) => Container(color: Colors.grey[200]),
            errorWidget: (_, __, ___) => Container(
              color: Colors.grey[200],
              child: const Icon(Icons.image, color: Colors.grey),
            ),
          );
        },
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;

  const _InfoChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
