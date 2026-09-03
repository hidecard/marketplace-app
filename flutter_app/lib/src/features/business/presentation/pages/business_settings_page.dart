import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/sidebar_drawer.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/services/firestore_service.dart';

class BusinessSettingsPage extends StatefulWidget {
  const BusinessSettingsPage({super.key});

  @override
  State<BusinessSettingsPage> createState() => _BusinessSettingsPageState();
}

class _BusinessSettingsPageState extends State<BusinessSettingsPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _desc = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _region = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final shop = context.read<AuthCubit>().state.shop;
    if (shop != null) {
      _name.text = shop.name;
      _desc.text = shop.description;
      _phone.text = shop.phone;
      _email.text = shop.email;
      _address.text = shop.address;
      _city.text = shop.city;
      _region.text = shop.region;
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthCubit>().state;
    final shop = auth.shop;
    if (shop == null) return;
    setState(() => _loading = true);
    try {
      final updated = shop.copyWith(
        name: _name.text,
        description: _desc.text,
        phone: _phone.text,
        email: _email.text,
        address: _address.text,
        city: _city.text,
        region: _region.text,
      );
      await FirestoreService().updateShop(updated);
      await context.read<AuthCubit>().setShop(updated);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings saved')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Shop Settings')),
      drawer: const SidebarDrawer(currentRoute: '/business/settings'),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Shop Name'),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _desc,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              decoration: const InputDecoration(labelText: 'Phone'),
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
            const SizedBox(height: 12),
            TextFormField(controller: _address, decoration: const InputDecoration(labelText: 'Address')),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: TextFormField(controller: _city, decoration: const InputDecoration(labelText: 'City'))),
                const SizedBox(width: 8),
                Expanded(child: TextFormField(controller: _region, decoration: const InputDecoration(labelText: 'Region'))),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _save,
                child: _loading ? const CircularProgressIndicator() : const Text('Save Settings'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}