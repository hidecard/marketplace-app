import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/services/firestore_service.dart';

class AdminSettingsPage extends StatefulWidget {
  const AdminSettingsPage({super.key});

  @override
  State<AdminSettingsPage> createState() => _AdminSettingsPageState();
}

class _AdminSettingsPageState extends State<AdminSettingsPage> {
  final _fs = FirestoreService();
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  bool _maintenance = false;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final data = await _fs.settingsStream().first;
    if (!mounted) return;
    setState(() {
      _nameCtrl.text = data?['appName'] as String? ?? 'Marketplace';
      _maintenance = data?['maintenanceMode'] as bool? ?? false;
      _loading = false;
    });
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    await _fs.updateSettings({
      'appName': _nameCtrl.text.trim(),
      'maintenanceMode': _maintenance,
    });
    setState(() => _saving = false);
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings saved')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
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
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextFormField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(labelText: 'App Name'),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter app name' : null,
                  ),
                  SwitchListTile(
                    title: const Text('Maintenance Mode'),
                    subtitle: const Text('Prevent non-admin access to the app'),
                    value: _maintenance,
                    onChanged: (v) => setState(() => _maintenance = v),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: _saving ? const CircularProgressIndicator() : const Text('Save Settings'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
