import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class HelpSupportPage extends StatefulWidget {
  const HelpSupportPage({super.key});

  @override
  State<HelpSupportPage> createState() => _HelpSupportPageState();
}

class _HelpSupportPageState extends State<HelpSupportPage> {
  static const _faqs = [
    _Faq(
      q: 'How do I track my order?',
      a: 'Go to your profile, tap Orders, and select the order to view its status and tracking info.',
    ),
    _Faq(
      q: 'How do I return a product?',
      a: 'Contact the seller via chat within 7 days of delivery to request a return or refund.',
    ),
    _Faq(
      q: 'How do I become a verified shop?',
      a: 'Create your shop, then submit a verification request from the business dashboard.',
    ),
    _Faq(
      q: 'What payment methods are supported?',
      a: 'Cash on delivery, KBZPay, WavePay, and bank transfer depending on the seller.',
    ),
    _Faq(
      q: 'How do I delete my account?',
      a: 'Contact support below and we will help you delete your account.',
    ),
  ];

  final _formKey = GlobalKey<FormState>();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final user = context.read<AuthCubit>().state.appUser;
    try {
      await FirestoreService().createNotification(AppNotification(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        userId: 'support',
        type: 'support',
        title: _subject.text.trim(),
        body: '${user?.displayName ?? "User"} (${user?.email ?? user?.uid}): ${_message.text.trim()}',
      ));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Message sent')));
        _subject.clear();
        _message.clear();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Help & Support')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Frequently Asked Questions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          ..._faqs.map((f) => ExpansionTile(
                title: Text(f.q, style: const TextStyle(fontWeight: FontWeight.w600)),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Text(f.a, style: TextStyle(color: Colors.grey[700])),
                  ),
                ],
              )),
          const SizedBox(height: 24),
          const Text('Contact us',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Form(
            key: _formKey,
            child: Column(
              children: [
                TextFormField(
                  controller: _subject,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _message,
                  maxLines: 5,
                  decoration: const InputDecoration(
                    labelText: 'Message',
                    border: OutlineInputBorder(),
                    alignLabelWithHint: true,
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.send),
                  label: const Text('Send'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Faq {
  final String q;
  final String a;
  const _Faq({required this.q, required this.a});
}

