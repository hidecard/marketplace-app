import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/services/firestore_service.dart';

class VerificationPage extends StatefulWidget {
  const VerificationPage({super.key});

  @override
  State<VerificationPage> createState() => _VerificationPageState();
}

class _VerificationPageState extends State<VerificationPage> {
  XFile? _nrc;
  XFile? _license;
  XFile? _selfie;
  final _noteCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _pick(String slot) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1280);
    if (file == null) return;
    setState(() {
      if (slot == 'nrc') _nrc = file;
      if (slot == 'license') _license = file;
      if (slot == 'selfie') _selfie = file;
    });
  }

  Future<void> _submit() async {
    final auth = context.read<AuthCubit>();
    final shop = auth.state.shop;
    final user = auth.state.firebaseUser;
    if (shop == null || user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Create a shop first')),
      );
      return;
    }
    if (_nrc == null || _selfie == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('NRC photo and selfie are required')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      final fs = FirestoreService();
      final nrcUrl = await fs.uploadVerificationDoc(user.uid, 'nrc', _nrc!);
      final selfieUrl = await fs.uploadVerificationDoc(user.uid, 'selfie', _selfie!);
      String? licenseUrl;
      if (_license != null) {
        licenseUrl = await fs.uploadVerificationDoc(user.uid, 'license', _license!);
      }
      await fs.callableVoid('submitVerification', params: {
        'shopId': shop.id,
        'nrcUrl': nrcUrl,
        'selfieUrl': selfieUrl,
        // ignore: use_null_aware_elements
        if (licenseUrl != null) 'licenseUrl': licenseUrl,
        // ignore: use_null_aware_elements
        if (_noteCtrl.text.trim().isNotEmpty) 'note': _noteCtrl.text.trim(),
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Verification request submitted')),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify your shop')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Icon(Icons.verified_outlined, size: 64, color: Color(0xFF2563EB)),
          const SizedBox(height: 8),
          const Text(
            'Submit a verification request to get the verified badge.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          _UploadTile(
            label: 'NRC (front) *',
            file: _nrc,
            onPick: () => _pick('nrc'),
          ),
          const SizedBox(height: 12),
          _UploadTile(
            label: 'Business license (optional)',
            file: _license,
            onPick: () => _pick('license'),
          ),
          const SizedBox(height: 12),
          _UploadTile(
            label: 'Selfie holding NRC *',
            file: _selfie,
            onPick: () => _pick('selfie'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _noteCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Note for the admin (optional)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _submitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text('Submit'),
            ),
          ),
        ],
      ),
    );
  }
}

class _UploadTile extends StatelessWidget {
  final String label;
  final XFile? file;
  final VoidCallback onPick;
  const _UploadTile({required this.label, required this.file, required this.onPick});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPick,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              file == null ? Icons.add_a_photo_outlined : Icons.check_circle,
              color: file == null ? Colors.grey : Colors.green,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                file == null ? label : '$label — ${file!.name}',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            if (file != null) const Icon(Icons.edit, size: 18, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
