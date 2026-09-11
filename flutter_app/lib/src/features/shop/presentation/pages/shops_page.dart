import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../business/presentation/cubit/shops_cubit.dart';

class ShopsPage extends StatelessWidget {
  const ShopsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ShopsCubit()..loadVerified(),
      child: const _ShopsPageBody(),
    );
  }
}

class _ShopsPageBody extends StatelessWidget {
  const _ShopsPageBody();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shops')),
      body: BlocBuilder<ShopsCubit, ShopsState>(
        builder: (context, state) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.shops.isEmpty) {
            return const EmptyState(
              icon: Icons.store_outlined,
              title: 'No verified shops yet',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: state.shops.length,
            itemBuilder: (_, i) {
              final shop = state.shops[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Theme.of(context).primaryColor,
                    child: Text(
                      shop.name.isNotEmpty ? shop.name[0].toUpperCase() : '?',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(shop.name),
                  subtitle: Text('${shop.city} • ${shop.rating.toStringAsFixed(1)} ★'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/shop/${shop.id}'),
                ),
              );
            },
          );
        },
      ),
    );
  }
}