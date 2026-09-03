import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class AddressesPage extends StatelessWidget {
  const AddressesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid == null) {
      return const Scaffold(body: Center(child: Text('Not signed in')));
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Addresses')),
      body: StreamBuilder<List<Address>>(
        stream: FirestoreService().addressesStream(uid),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final list = snap.data ?? [];
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.location_on_outlined,
              title: 'No addresses yet',
              message: 'Tap + to add a new address.',
            );
          }
          return ListView.separated(
            itemCount: list.length,
            separatorBuilder: (_, __) => const SizedBox(height: 4),
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemBuilder: (_, i) => _AddressTile(address: list[i], userId: uid),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, uid),
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
    );
  }

  Future<void> _openForm(BuildContext context, String uid, {Address? existing}) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _AddressForm(existing: existing),
    );
    if (saved == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Address saved')));
    }
  }
}

class _AddressTile extends StatelessWidget {
  final Address address;
  final String userId;
  const _AddressTile({required this.address, required this.userId});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        leading: Icon(
          address.isDefault ? Icons.check_circle : Icons.location_on_outlined,
          color: address.isDefault ? Theme.of(context).colorScheme.primary : null,
        ),
        title: Row(
          children: [
            Text(address.label.isNotEmpty ? address.label : address.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            if (address.isDefault) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Default',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
        subtitle: Text('${address.address}, ${address.city}${address.region.isNotEmpty ? ', ${address.region}' : ''}'),
        trailing: PopupMenuButton<String>(
          onSelected: (v) async {
            final fs = FirestoreService();
            if (v == 'delete') {
              await fs.deleteAddress(userId, address.id);
            } else if (v == 'default') {
              await fs.addAddress(userId, Address(
                id: address.id,
                label: address.label,
                name: address.name,
                phone: address.phone,
                address: address.address,
                city: address.city,
                region: address.region,
                isDefault: true,
                userId: userId,
              ));
            }
          },
          itemBuilder: (_) => [
            if (!address.isDefault) const PopupMenuItem(value: 'default', child: Text('Set as default')),
            const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
          ],
        ),
      ),
    );
  }
}

class _AddressForm extends StatefulWidget {
  final Address? existing;
  const _AddressForm({this.existing});

  @override
  State<_AddressForm> createState() => _AddressFormState();
}

class _AddressFormState extends State<_AddressForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _label = TextEditingController(text: widget.existing?.label ?? 'Home');
  late final TextEditingController _name = TextEditingController(text: widget.existing?.name ?? '');
  late final TextEditingController _phone = TextEditingController(text: widget.existing?.phone ?? '');
  late final TextEditingController _address = TextEditingController(text: widget.existing?.address ?? '');
  late final TextEditingController _city = TextEditingController(text: widget.existing?.city ?? '');
  late final TextEditingController _region = TextEditingController(text: widget.existing?.region ?? '');
  late bool _isDefault = widget.existing?.isDefault ?? false;
  bool _saving = false;

  @override
  void dispose() {
    _label.dispose();
    _name.dispose();
    _phone.dispose();
    _address.dispose();
    _city.dispose();
    _region.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final uid = context.read<AuthCubit>().state.appUser!.uid;
    final id = widget.existing?.id ?? DateTime.now().millisecondsSinceEpoch.toString();
    final a = Address(
      id: id,
      userId: uid,
      label: _label.text.trim(),
      name: _name.text.trim(),
      phone: _phone.text.trim(),
      address: _address.text.trim(),
      city: _city.text.trim(),
      region: _region.text.trim(),
      isDefault: _isDefault,
    );
    await FirestoreService().addAddress(uid, a);
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.existing == null ? 'Add Address' : 'Edit Address',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            TextFormField(controller: _label, decoration: const InputDecoration(labelText: 'Label')),
            TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Full name'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null),
            TextFormField(controller: _phone, decoration: const InputDecoration(labelText: 'Phone'),
                keyboardType: TextInputType.phone),
            TextFormField(controller: _address, decoration: const InputDecoration(labelText: 'Street address'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null, maxLines: 2),
            TextFormField(controller: _city, decoration: const InputDecoration(labelText: 'City'),
                validator: (v) => v == null || v.isEmpty ? 'Required' : null),
            TextFormField(controller: _region, decoration: const InputDecoration(labelText: 'Region')),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Set as default'),
              value: _isDefault,
              onChanged: (v) => setState(() => _isDefault = v),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Save'),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}