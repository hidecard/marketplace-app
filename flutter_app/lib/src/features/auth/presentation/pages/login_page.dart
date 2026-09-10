import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../cubit/auth_cubit.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

enum _AuthMode { email, phone }

class _LoginPageState extends State<LoginPage> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  bool _isRegister = false;
  _AuthMode _mode = _AuthMode.email;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final auth = context.read<AuthCubit>();
    if (_mode == _AuthMode.phone) {
      if (auth.state.verificationId == null) {
        auth.sendPhoneOtp(_phoneCtrl.text.trim());
      } else {
        auth.verifyPhoneOtp(_otpCtrl.text.trim());
      }
      return;
    }
    if (_isRegister) {
      auth.signUpWithEmailAndPassword(
        _emailCtrl.text.trim(),
        _passwordCtrl.text,
        _nameCtrl.text.trim().isEmpty ? 'User' : _nameCtrl.text.trim(),
      );
    } else {
      auth.signInWithEmailAndPassword(_emailCtrl.text.trim(), _passwordCtrl.text);
    }
  }

  void _forgotPassword() {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter your email above first')),
      );
      return;
    }
    context.read<AuthCubit>().sendPasswordReset(email);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocConsumer<AuthCubit, AuthState>(
        listener: (context, state) {
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.error!)),
            );
          }
          if (state.isAuthenticated) {
            if (state.isAdmin) {
              context.go('/admin');
            } else if (state.shop != null) {
              context.go('/business');
            } else {
              context.go('/');
            }
          }
        },
        builder: (context, state) {
          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 60),
                  const Icon(Icons.storefront, size: 80, color: Color(0xFF2563EB)),
                  const SizedBox(height: 24),
                  const Text(
                    'Marketplace',
                    style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  SegmentedButton<_AuthMode>(
                    segments: const [
                      ButtonSegment(value: _AuthMode.email, label: Text('Email'), icon: Icon(Icons.email_outlined)),
                      ButtonSegment(value: _AuthMode.phone, label: Text('Phone'), icon: Icon(Icons.phone_outlined)),
                    ],
                    selected: {_mode},
                    onSelectionChanged: (s) {
                      setState(() {
                        _mode = s.first;
                        context.read<AuthCubit>().clearError();
                      });
                    },
                  ),
                  const SizedBox(height: 24),
                  if (_mode == _AuthMode.email) ..._buildEmailFields(state),
                  if (_mode == _AuthMode.phone) ..._buildPhoneFields(state),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: state.isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(_submitLabel(state)),
                    ),
                  ),
                  if (_mode == _AuthMode.email) ...[
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: _forgotPassword,
                        child: const Text('Forgot password?'),
                      ),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _isRegister = !_isRegister),
                      child: Text(_isRegister
                          ? 'Already have an account? Sign In'
                          : "Don't have an account? Sign Up"),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _submitLabel(AuthState state) {
    if (_mode == _AuthMode.phone) {
      return state.verificationId == null ? 'Send OTP' : 'Verify OTP';
    }
    return _isRegister ? 'Sign Up' : 'Sign In';
  }

  List<Widget> _buildEmailFields(AuthState state) {
    return [
      if (_isRegister)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
            controller: _nameCtrl,
            decoration: const InputDecoration(
              labelText: 'Name',
              prefixIcon: Icon(Icons.person_outlined),
            ),
          ),
        ),
      TextField(
        controller: _emailCtrl,
        keyboardType: TextInputType.emailAddress,
        autocorrect: false,
        decoration: const InputDecoration(
          labelText: 'Email',
          prefixIcon: Icon(Icons.email_outlined),
        ),
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _passwordCtrl,
        obscureText: true,
        decoration: const InputDecoration(
          labelText: 'Password',
          prefixIcon: Icon(Icons.lock_outlined),
        ),
      ),
    ];
  }

  List<Widget> _buildPhoneFields(AuthState state) {
    final otpSent = state.verificationId != null;
    return [
      TextField(
        controller: _phoneCtrl,
        keyboardType: TextInputType.phone,
        enabled: !otpSent,
        decoration: const InputDecoration(
          labelText: 'Phone number',
          prefixIcon: Icon(Icons.phone_outlined),
          hintText: '+95...',
        ),
      ),
      if (otpSent) ...[
        const SizedBox(height: 16),
        TextField(
          controller: _otpCtrl,
          keyboardType: TextInputType.number,
          maxLength: 6,
          decoration: const InputDecoration(
            labelText: '6-digit code',
            prefixIcon: Icon(Icons.sms_outlined),
          ),
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => context.read<AuthCubit>().sendPhoneOtp(_phoneCtrl.text.trim()),
            child: const Text('Resend code'),
          ),
        ),
      ],
    ];
  }
}
