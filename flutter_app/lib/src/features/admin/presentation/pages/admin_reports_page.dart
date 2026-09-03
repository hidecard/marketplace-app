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
    final fmt = DateFormat('MMM dd, yyyy');
    return Scaffold(
      appBar: AppBar(title: const Text('Reports')),
      body: StreamBuilder<List<Report>>(
        stream: fs.reportsStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final list = snap.data!;
          if (list.isEmpty) return const EmptyState(icon: Icons.flag_outlined, title: 'No reports found');
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final r = list[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  title: Text(r.reason),
                  subtitle: Text('${r.targetType.name} • ${r.status.name} • ${fmt.format(r.createdAt ?? DateTime.now())}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (r.status == ReportStatus.pending) ...[
                        IconButton(
                          icon: const Icon(Icons.check, color: Colors.green),
                          onPressed: () => _update(context, fs, r, ReportStatus.resolved),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.red),
                          onPressed: () => _update(context, fs, r, ReportStatus.dismissed),
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

  Future<void> _update(BuildContext context, FirestoreService fs, Report r, ReportStatus status) async {
    final note = await showDialog<String>(
      context: context,
      builder: (_) {
        final controller = TextEditingController();
        return AlertDialog(
          title: Text(status == ReportStatus.resolved ? 'Resolve Report' : 'Dismiss Report'),
          content: TextField(controller: controller, decoration: const InputDecoration(labelText: 'Admin Note'), maxLines: 3),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Submit')),
          ],
        );
      },
    );
    if (note != null && context.mounted) {
      await fs.updateReportStatus(r.id, status, note);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Report ${status == ReportStatus.resolved ? 'resolved' : 'dismissed'}')));
    }
  }
}
