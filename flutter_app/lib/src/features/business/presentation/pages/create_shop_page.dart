import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class CreateShopPage extends StatefulWidget {
  const CreateShopPage({super.key});

  @override
  State<CreateShopPage> createState() => _CreateShopPageState();
}

class _CreateShopPageState extends State<CreateShopPage> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _slug = TextEditingController();
  final _desc = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _region = TextEditingController();
  String? _logoUrl;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthCubit>().state.appUser;
    if (user != null) {
      _phone.text = user.phoneNumber ?? '';
      _email.text = user.email ?? '';
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _slug.dispose();
    _desc.dispose();
    _phone.dispose();
    _email.dispose();
    _address.dispose();
    _city.dispose();
    _region.dispose();
    super.dispose();
  }

  String _slugify(String s) =>
      s.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-').replaceAll(RegExp(r'(^-|-$)'), '');

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512);
    if (xfile == null) return;
    setState(() => _loading = true);
    try {
      final url = await FirestoreService().uploadShopLogo(xfile);
      if (!mounted) return;
      setState(() => _logoUrl = url);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Logo upload failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthCubit>();
    final user = auth.state.firebaseUser;
    if (user == null) return;
    setState(() => _loading = true);
    try {
      final shop = await FirestoreService().callable<Shop>(
        'onCreateShop',
        params: {
          'name': _name.text.trim(),
          'slug': _slug.text.trim().isEmpty
              ? _slugify(_name.text.trim())
              : _slugify(_slug.text.trim()),
          'description': _desc.text.trim(),
          'phone': _phone.text.trim(),
          'email': _email.text.trim(),
          'address': _address.text.trim(),
          'city': _city.text.trim(),
          'region': _region.text.trim(),
          if (_logoUrl != null) 'logo': _logoUrl,
        },
        fromMap: (m) => Shop.fromMap(m, m['id'] as String),
      );
      await auth.setShop(shop);
      // Refresh custom claims (shopId) so firestore rules accept this user as a member.
      await user.getIdToken(true);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Shop created! Now verify to unlock selling.')),
      );
      context.go('/business/verification');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not create shop: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create Shop')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Center(
              child: GestureDetector(
                onTap: _pickLogo,
                child: CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.grey[200],
                  backgroundImage:
                      _logoUrl != null ? NetworkImage(_logoUrl!) : null,
                  child: _logoUrl == null
                      ? const Icon(Icons.add_a_photo, size: 28, color: Colors.grey)
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 4),
            const Center(
              child: Text('Tap to add a logo (optional)',
                  style: TextStyle(color: Colors.grey, fontSize: 12)),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Shop Name *'),
              onChanged: (v) {
                if (_slug.text.isEmpty) _slug.text = _slugify(v);
              },
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _slug,
              decoration: const InputDecoration(
                labelText: 'URL slug',
                helperText: 'Used in your shop link (lowercase, dashes)',
                prefixText: 'marketplace.app/shop/',
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return null;
                if (!RegExp(r'^[a-z0-9-]+$').hasMatch(v)) {
                  return 'Lowercase letters, numbers, dashes only';
                }
                return null;
              },
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
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone *'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Street address *'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _city,
                    decoration: const InputDecoration(labelText: 'City *'),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _region,
                    decoration: const InputDecoration(labelText: 'Region *'),
                    validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _create,
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Create Shop'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
