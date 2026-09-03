import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class FavoritesPage extends StatelessWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid == null) {
      return const Scaffold(body: Center(child: Text('Not signed in')));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Favorites')),
      body: StreamBuilder<List<String>>(
        stream: FirestoreService().favoriteIdsStream(uid),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final ids = snap.data ?? [];
          if (ids.isEmpty) {
            return const EmptyState(
              icon: Icons.favorite_border,
              title: 'No favorites yet',
              message: 'Tap the heart icon on products to add them here.',
            );
          }
          return _FavoritesGrid(ids: ids, userId: uid);
        },
      ),
    );
  }
}

class _FavoritesGrid extends StatelessWidget {
  final List<String> ids;
  final String userId;
  _FavoritesGrid({required this.ids, required this.userId});

  final FirestoreService _fs = FirestoreService();
  final Map<String, Product> _cache = {};

  Future<Product?> _fetch(String id) async {
    if (_cache.containsKey(id)) return _cache[id];
    final p = await _fs.getProduct(id);
    if (p != null) _cache[id] = p;
    return p;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Product?>>(
      future: Future.wait(ids.map(_fetch)),
      builder: (context, snap) {
        final products = (snap.data ?? []).whereType<Product>().toList();
        if (products.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }
        return GridView.builder(
          padding: const EdgeInsets.all(12),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.7,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: products.length,
          itemBuilder: (_, i) => ProductCard(
            product: products[i],
            isFavorite: true,
            onFavoriteToggle: () async {
              await _fs.removeFavorite(userId, products[i].id);
            },
          ),
        );
      },
    );
  }
}