import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/sidebar_drawer.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../customers/presentation/cubit/customers_cubit.dart';

class CustomersPage extends StatefulWidget {
  const CustomersPage({super.key});

  @override
  State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends State<CustomersPage> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final shop = context.read<AuthCubit>().state.shop;
    if (shop != null) context.read<CustomersCubit>().bind(shop.id);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      drawer: const SidebarDrawer(currentRoute: '/business/customers'),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchCtrl,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search customers...',
              ),
              onChanged: (v) => context.read<CustomersCubit>().search(v),
            ),
          ),
          Expanded(
            child: BlocBuilder<CustomersCubit, CustomersState>(
              builder: (context, state) {
                if (state.isLoading) return const Center(child: CircularProgressIndicator());
                final filtered = context.read<CustomersCubit>().filtered;
                if (filtered.isEmpty) {
                  return const EmptyState(icon: Icons.people_outline, title: 'No customers');
                }
                return ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (_, i) {
                    final c = filtered[i];
                    return ListTile(
                      leading: CircleAvatar(
                        child: Text(c.displayName.isNotEmpty ? c.displayName[0].toUpperCase() : '?'),
                      ),
                      title: Text(c.displayName),
                      subtitle: Text(c.email ?? c.phoneNumber ?? 'No contact'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}