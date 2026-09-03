import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';

class AdminDashboardPage extends StatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  State<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends State<AdminDashboardPage> {
  final _fs = FirestoreService();
  int _users = 0;
  int _shops = 0;
  int _products = 0;
  int _orders = 0;
  int _pendingVerifications = 0;
  List<Order> _recentOrders = [];
  List<AppUser> _recentUsers = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _fs.allUsersStream().listen((u) {
      setState(() => _users = u.length);
      _recentUsers = u.take(5).toList();
    });
    _fs.shopsStream(verifiedOnly: false).listen((s) => setState(() => _shops = s.length));
    _fs.allProductsStream().listen((p) => setState(() => _products = p.length));
    _fs.allOrdersStream().listen((o) {
      setState(() {
        _orders = o.length;
        _recentOrders = o.take(5).toList();
      });
    });
    _fs.verificationsStream().listen((v) {
      setState(() => _pendingVerifications =
          v.where((r) => r.status == VerificationRequestStatus.pending).length);
    });
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('MMM dd, yyyy');
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Dashboard')),
      drawer: Drawer(
        child: ListView(
          children: [
            const DrawerHeader(child: Text('Admin Panel', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold))),
            ListTile(leading: const Icon(Icons.dashboard), title: const Text('Dashboard'), onTap: () => context.go('/admin')),
            ListTile(leading: const Icon(Icons.people), title: const Text('Users'), onTap: () => context.go('/admin/users')),
            ListTile(leading: const Icon(Icons.store), title: const Text('Shops'), onTap: () => context.go('/admin/shops')),
            ListTile(leading: const Icon(Icons.inventory), title: const Text('Products'), onTap: () => context.go('/admin/products')),
            ListTile(leading: const Icon(Icons.shopping_bag), title: const Text('Orders'), onTap: () => context.go('/admin/orders')),
            ListTile(leading: const Icon(Icons.verified), title: const Text('Verifications'), onTap: () => context.go('/admin/verifications')),
            ListTile(leading: const Icon(Icons.flag), title: const Text('Reports'), onTap: () => context.go('/admin/reports')),
            ListTile(leading: const Icon(Icons.category), title: const Text('Categories'), onTap: () => context.go('/admin/categories')),
            ListTile(leading: const Icon(Icons.image), title: const Text('Banners'), onTap: () => context.go('/admin/banners')),
            ListTile(leading: const Icon(Icons.settings), title: const Text('Settings'), onTap: () => context.go('/admin/settings')),
            const Divider(),
            ListTile(leading: const Icon(Icons.logout), title: const Text('Logout'), onTap: () => context.go('/login')),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 1.4,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            children: [
              _StatCard(title: 'Users', value: '$_users', icon: Icons.people, color: Colors.blue, onTap: () => context.go('/admin/users')),
              _StatCard(title: 'Shops', value: '$_shops', icon: Icons.store, color: Colors.green, onTap: () => context.go('/admin/shops')),
              _StatCard(title: 'Products', value: '$_products', icon: Icons.inventory, color: Colors.orange, onTap: () => context.go('/admin/products')),
              _StatCard(title: 'Orders', value: '$_orders', icon: Icons.shopping_bag, color: Colors.purple, onTap: () => context.go('/admin/orders')),
              _StatCard(title: 'Verifications', value: '$_pendingVerifications', icon: Icons.verified, color: Colors.teal, onTap: () => context.go('/admin/verifications')),
              _StatCard(title: 'Banners', value: 'Manage', icon: Icons.image, color: Colors.pink, onTap: () => context.go('/admin/banners')),
            ],
          ),
          const SizedBox(height: 24),
          const Text('Recent Orders', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _recentOrders.isEmpty
              ? const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No orders yet')))
              : Column(
                  children: _recentOrders.map((o) {
                    return Card(
                      child: ListTile(
                        title: Text('#${o.orderNumber}'),
                        subtitle: Text('${o.status.name} • ${fmt.format(o.createdAt ?? DateTime.now())}'),
                        trailing: Text(NumberFormat.currency(symbol: '', decimalDigits: 0).format(o.total)),
                      ),
                    );
                  }).toList(),
                ),
          const SizedBox(height: 24),
          const Text('Recent Users', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _recentUsers.isEmpty
              ? const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No users yet')))
              : Column(
                  children: _recentUsers.map((u) {
                    return Card(
                      child: ListTile(
                        leading: CircleAvatar(child: Text(u.displayName.isNotEmpty ? u.displayName[0].toUpperCase() : '?')),
                        title: Text(u.displayName),
                        subtitle: Text(u.email ?? u.phoneNumber ?? 'No contact'),
                      ),
                    );
                  }).toList(),
                ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _StatCard({required this.title, required this.value, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 28),
              Text(title, style: const TextStyle(color: Colors.grey)),
              Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            ],
          ),
        ),
      ),
    );
  }
}
