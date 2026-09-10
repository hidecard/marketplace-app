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
          if (list.isEmpty) {
            return const EmptyState(icon: Icons.verified_outlined, title: 'No verification requests');
          }
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final v = list[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ExpansionTile(
                  leading: const Icon(Icons.store),
                  title: Text(v.shopName),
                  subtitle: Text(
                    '${v.ownerName} • ${v.status.name} • ${fmt.format(v.createdAt ?? DateTime.now())}',
                  ),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  children: [
                    if (v.nrcUrl != null && v.nrcUrl!.isNotEmpty)
                      _ImagePreview(label: 'NRC', url: v.nrcUrl!),
                    if (v.licenseUrl != null && v.licenseUrl!.isNotEmpty)
                      _ImagePreview(label: 'License', url: v.licenseUrl!),
                    if (v.selfieUrl != null && v.selfieUrl!.isNotEmpty)
                      _ImagePreview(label: 'Selfie', url: v.selfieUrl!),
                    if (v.description.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text('Description: ${v.description}'),
                    ],
                    if (v.status == VerificationRequestStatus.pending) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(
                            onPressed: () => _review(context, fs, v, approved: false),
                            icon: const Icon(Icons.close, color: Colors.red),
                            label: const Text('Reject'),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: () => _review(context, fs, v, approved: true),
                            icon: const Icon(Icons.check, color: Colors.white),
                            label: const Text('Approve'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _review(
    BuildContext context,
    FirestoreService fs,
    VerificationRequest v, {
    required bool approved,
  }) async {
    final note = await _askNote(context, approved ? 'Approve Verification' : 'Reject Verification');
    if (note == null) return;
    try {
      await fs.callableVoid('reviewVerification', params: {
        'requestId': v.id,
        'decision': approved ? 'approved' : 'rejected',
        if (note.isNotEmpty) 'note': note,
      });
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(approved ? 'Approved' : 'Rejected')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  Future<String?> _askNote(BuildContext context, String title) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Admin Note (optional)'),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }
}

class _ImagePreview extends StatelessWidget {
  final String label;
  final String url;
  const _ImagePreview({required this.label, required this.url});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => Container(
                height: 160,
                color: Colors.grey[200],
                alignment: Alignment.center,
                child: const Text('Image unavailable'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
