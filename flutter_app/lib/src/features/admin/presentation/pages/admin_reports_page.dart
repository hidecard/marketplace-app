import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminReportsPage extends StatelessWidget {
  const AdminReportsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    final fmt = DateFormat('MMM dd, yyyy HH:mm');
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: StreamBuilder<List<Report>>(
        stream: fs.reportsStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final list = snap.data!;
          if (list.isEmpty) {
            return const EmptyState(icon: Icons.flag_outlined, title: 'No reports found');
          }
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final r = list[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ExpansionTile(
                  leading: const Icon(Icons.flag_outlined),
                  title: Text(r.reason, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    '${r.targetType.name} • ${r.status.name} • ${fmt.format(r.createdAt ?? DateTime.now())}',
                  ),
                  childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  children: [
                    if (r.description.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(r.description),
                    ],
                    if (r.status == ReportStatus.pending) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          TextButton.icon(
                            onPressed: () => _review(context, fs, r, 'dismissed'),
                            icon: const Icon(Icons.close, color: Colors.red),
                            label: const Text('Dismiss'),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: () => _review(context, fs, r, 'resolved'),
                            icon: const Icon(Icons.check, color: Colors.white),
                            label: const Text('Resolve'),
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
    Report r,
    String decision,
  ) async {
    final controller = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(decision == 'resolved' ? 'Resolve Report' : 'Dismiss Report'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Admin note (optional)'),
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
    if (note == null) return;
    try {
      await fs.reviewReport(
        reportId: r.id,
        decision: decision,
        note: note.isEmpty ? null : note,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(decision == 'resolved' ? 'Resolved' : 'Dismissed')),
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
}
