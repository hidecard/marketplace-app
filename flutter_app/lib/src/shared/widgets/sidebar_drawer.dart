import 'package:flutter/material.dart';

class SidebarDrawer extends StatelessWidget {
  final String currentRoute;
  const SidebarDrawer({super.key, this.currentRoute = '/business'});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: Color(0xFF2563EB)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(radius: 28, backgroundColor: Colors.white, child: Icon(Icons.person, color: Color(0xFF2563EB))),
                const SizedBox(height: 12),
                const Text('Business Mode', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
                TextButton.icon(onPressed: () {}, icon: const Icon(Icons.storefront, size: 18), label: const Text('Shop Name')),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Dashboard'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/dashboard'),
          ),
          ListTile(
            leading: const Icon(Icons.point_of_sale),
            title: const Text('POS'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/pos'),
          ),
          ListTile(
            leading: const Icon(Icons.inventory_2),
            title: const Text('Products'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/products'),
          ),
          ListTile(
            leading: const Icon(Icons.shopping_bag),
            title: const Text('Orders'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/orders'),
          ),
          ListTile(
            leading: const Icon(Icons.analytics),
            title: const Text('Analytics'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/analytics'),
          ),
          ListTile(
            leading: const Icon(Icons.receipt_long),
            title: const Text('Expenses'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/expenses'),
          ),
          ListTile(
            leading: const Icon(Icons.people),
            title: const Text('Customers'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/customers'),
          ),
          ListTile(
            leading: const Icon(Icons.category),
            title: const Text('Categories'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/categories'),
          ),
          ListTile(
            leading: const Icon(Icons.settings),
            title: const Text('Settings'),
            onTap: () => Navigator.pushReplacementNamed(context, '/business/settings'),
          ),
        ],
      ),
    );
  }
}
