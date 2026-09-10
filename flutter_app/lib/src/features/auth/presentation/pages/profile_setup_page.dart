import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/models/models.dart';
import '../cubit/auth_cubit.dart';

class ProfileSetupPage extends StatefulWidget {
  const ProfileSetupPage({super.key});

  @override
  State<ProfileSetupPage> createState() => _ProfileSetupPageState();
}

class _ProfileSetupPageState extends State<ProfileSetupPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthCubit>().state.appUser;
    _nameCtrl.text = (user?.displayName.isNotEmpty ?? false) ? user!.displayName : '';
    _phoneCtrl.text = user?.phoneNumber ?? '';
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final auth = context.read<AuthCubit>();
    final current = auth.state.appUser;
    if (current != null) {
      final updated = AppUser(
        uid: current.uid,
        email: current.email,
        phoneNumber: _phoneCtrl.text.trim().isEmpty ? current.phoneNumber : _phoneCtrl.text.trim(),
        displayName: _nameCtrl.text.trim(),
        photoURL: current.photoURL,
        role: current.role,
        phoneVerified: _phoneCtrl.text.trim().isNotEmpty,
        shopVerified: current.shopVerified,
        status: current.status,
        fcmToken: current.fcmToken,
        createdAt: current.createdAt,
        updatedAt: DateTime.now(),
      );
      await auth.updateAppUser(updated);
    } else {
      await auth.markProfileComplete();
    }
    if (!mounted) return;
    setState(() => _saving = false);
    final dest = auth.state.isAdmin ? '/admin' : '/';
    context.go(dest);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Complete your profile'),
        automaticallyImplyLeading: false,
      ),
      body: BlocListener<AuthCubit, AuthState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!)),
            );
          }
        },
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  const Icon(Icons.account_circle, size: 80, color: Color(0xFF2563EB)),
                  const SizedBox(height: 16),
                  const Text(
                    'Tell us a bit about yourself',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'You can change this later in your profile.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _nameCtrl,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Please enter your name' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone number',
                      prefixIcon: Icon(Icons.phone_outlined),
                      hintText: '+95...',
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2),
                          )
                        : const Text('Continue'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
