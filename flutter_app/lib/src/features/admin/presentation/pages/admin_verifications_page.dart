import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminVerificationsPage extends StatelessWidget {
  const AdminVerificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    final fmt = DateFormat('MMM dd, yyyy');
    return Scaffold(
      appBar: AppBar(title: const Text('Verifications')),
      body: StreamBuilder<List<VerificationRequest>>(
        stream: fs.verificationsStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final list = snap.data!;
          if (list.isEmpty) return const EmptyState(icon: Icons.verified_outlined, title: 'No verification requests');
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final v = list[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  title: Text(v.shopName),
                  subtitle: Text('${v.ownerName} • ${v.status.name} • ${fmt.format(v.createdAt ?? DateTime.now())}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (v.status == VerificationRequestStatus.pending) ...[
                        IconButton(
                          icon: const Icon(Icons.check, color: Colors.green),
                          onPressed: () => _approve(context, fs, v),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.red),
                          onPressed: () => _reject(context, fs, v),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _approve(BuildContext context, FirestoreService fs, VerificationRequest v) async {
    final note = await _askNote(context, 'Approve Verification');
    if (note != null) {
      await fs.updateVerificationStatus(v.id, VerificationRequestStatus.approved, note);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification approved')));
    }
  }

  void _reject(BuildContext context, FirestoreService fs, VerificationRequest v) async {
    final note = await _askNote(context, 'Reject Verification');
    if (note != null) {
      await fs.updateVerificationStatus(v.id, VerificationRequestStatus.rejected, note);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verification rejected')));
    }
  }

  Future<String?> _askNote(BuildContext context, String title) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'Admin Note'), maxLines: 3),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Submit')),
        ],
      ),
    );
  }
}
