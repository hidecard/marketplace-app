import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../shared/widgets/sidebar_drawer.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class VerificationPage extends StatefulWidget {
  const VerificationPage({super.key});

  @override
  State<VerificationPage> createState() => _VerificationPageState();
}

class _VerificationPageState extends State<VerificationPage> {
  VerificationRequest? _request;
  String? _uid;

  @override
  void initState() {
    super.initState();
    _uid = context.read<AuthCubit>().state.firebaseUser?.uid;
    _load();
  }

  void _load() {
    if (_uid == null) return;
    FirestoreService().myVerificationStream(_uid!).listen((r) {
      if (mounted) setState(() => _request = r);
    });
  }

  Future<void> _submit() async {
    if (_uid == null) return;
    final auth = context.read<AuthCubit>().state;
    final shop = auth.shop;
    if (shop == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Create a shop first')),
      );
      return;
    }
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final req = VerificationRequest(
      id: id,
      shopId: shop.id,
      userId: _uid!,
      shopName: shop.name,
      ownerName: auth.appUser?.displayName ?? '',
      phone: shop.phone,
      email: shop.email,
      address: shop.address,
      city: shop.city,
      region: shop.region,
      description: shop.description,
      status: VerificationRequestStatus.pending,
    );
    await FirestoreService().createVerificationRequest(req);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verification')),
      drawer: const SidebarDrawer(currentRoute: '/business/verification'),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: _request == null
            ? Column(
                children: [
                  const Icon(Icons.verified_outlined, size: 80, color: Colors.grey),
                  const SizedBox(height: 12),
                  const Text('Verify your shop', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text(
                    'Submit a verification request to get a verified badge on your shop.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(onPressed: _submit, child: const Text('Submit Request')),
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Status', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Chip(
                    label: Text(_request!.status.name),
                    backgroundColor: _request!.status == VerificationRequestStatus.approved
                        ? Colors.green.withValues(alpha: 0.2)
                        : _request!.status == VerificationRequestStatus.rejected
                            ? Colors.red.withValues(alpha: 0.2)
                            : Colors.orange.withValues(alpha: 0.2),
                  ),
                  if (_request!.adminNote != null) ...[
                    const SizedBox(height: 12),
                    const Text('Admin Note', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(_request!.adminNote!),
                  ],
                ],
              ),
      ),
    );
  }
}