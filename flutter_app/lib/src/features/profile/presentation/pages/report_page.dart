import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ReportPage extends StatefulWidget {
  final String targetType;
  final String targetId;
  const ReportPage({super.key, required this.targetType, required this.targetId});

  @override
  State<ReportPage> createState() => _ReportPageState();
}

class _ReportPageState extends State<ReportPage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _description = TextEditingController();
  String _reason = 'Inappropriate content';
  bool _submitting = false;

  static const _reasons = [
    'Inappropriate content',
    'Spam or scam',
    'Fake product',
    'Offensive language',
    'Wrong category',
    'Other',
  ];

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final user = context.read<AuthCubit>().state.appUser;
    if (user == null) {
      setState(() => _submitting = false);
      return;
    }
    try {
      final id = DateTime.now().millisecondsSinceEpoch.toString();
      final report = Report(
        id: id,
        reporterId: user.uid,
        targetType: ReportTargetType.values.firstWhere(
          (e) => e.name == widget.targetType,
          orElse: () => ReportTargetType.product,
        ),
        targetId: widget.targetId,
        reason: _reason,
        description: _description.text.trim(),
      );
      await FirestoreService().createReport(report);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Report submitted')));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Report')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Reporting ${widget.targetType}',
                  style: TextStyle(color: Colors.grey[600])),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _reason,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  border: OutlineInputBorder(),
                ),
                items: _reasons.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                onChanged: (v) => setState(() => _reason = v ?? _reason),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _description,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please describe the issue' : null,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
                label: const Text('Submit Report'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}