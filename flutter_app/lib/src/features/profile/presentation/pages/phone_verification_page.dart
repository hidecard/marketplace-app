import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class PhoneVerificationPage extends StatefulWidget {
  const PhoneVerificationPage({super.key});

  @override
  State<PhoneVerificationPage> createState() => _PhoneVerificationPageState();
}

class _PhoneVerificationPageState extends State<PhoneVerificationPage> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String _generatedOtp = '';
  bool _otpSent = false;
  bool _verifying = false;
  final FirestoreService _fs = FirestoreService();

  @override
  void initState() {
    super.initState();
    final current = context.read<AuthCubit>().state.appUser?.phoneNumber;
    if (current != null && current.isNotEmpty) {
      _phone.text = current;
    }
  }

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  void _sendOtp() {
    if (!_formKey.currentState!.validate()) return;
    final otp = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
    setState(() {
      _generatedOtp = otp;
      _otpSent = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('OTP sent (demo: $otp)')),
    );
  }

  Future<void> _verify() async {
    if (_otp.text.trim() != _generatedOtp) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid OTP')),
      );
      return;
    }
    setState(() => _verifying = true);
    final auth = context.read<AuthCubit>();
    final user = auth.state.appUser;
    if (user != null) {
      final updated = AppUser(
        uid: user.uid,
        email: user.email,
        phoneNumber: _phone.text.trim(),
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: user.role,
        phoneVerified: true,
        shopVerified: user.shopVerified,
        status: user.status,
        fcmToken: user.fcmToken,
        createdAt: user.createdAt,
        updatedAt: DateTime.now(),
      );
      await auth.updateAppUser(updated);
      await _fs.updateUser(updated);
    }
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Phone verified')),
      );
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final verified = context.watch<AuthCubit>().state.appUser?.phoneVerified ?? false;
    return Scaffold(
      appBar: AppBar(title: const Text('Verify Phone')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (verified)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.verified, color: Colors.green),
                      SizedBox(width: 8),
                      Text('Your phone is verified'),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.orange),
                      SizedBox(width: 8),
                      Expanded(child: Text('Phone verification adds trust and unlocks features.')),
                    ],
                  ),
                ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone number',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
                validator: (v) => v == null || v.trim().length < 6 ? 'Enter a valid phone' : null,
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: _otpSent ? null : _sendOtp,
                icon: const Icon(Icons.sms_outlined),
                label: const Text('Send OTP'),
              ),
              if (_otpSent) ...[
                const SizedBox(height: 24),
                TextFormField(
                  controller: _otp,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: const InputDecoration(
                    labelText: 'Enter 6-digit OTP',
                    border: OutlineInputBorder(),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _verifying ? null : _verify,
                  icon: _verifying
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.check),
                  label: const Text('Verify'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}