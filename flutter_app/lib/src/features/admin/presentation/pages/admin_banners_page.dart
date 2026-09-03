import 'package:flutter/material.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminBannersPage extends StatelessWidget {
  const AdminBannersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Banners'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showForm(context, fs),
          ),
        ],
      ),
      body: StreamBuilder<List<AppBanner>>(
        stream: fs.allBannersStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final list = snap.data!;
          if (list.isEmpty) return const EmptyState(icon: Icons.image_outlined, title: 'No banners found');
          return ListView.builder(
            itemCount: list.length,
            itemBuilder: (_, i) {
              final b = list[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.image),
                  title: Text(b.title),
                  subtitle: Text(b.active ? 'Active' : 'Inactive'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(b.active ? Icons.visibility_off : Icons.visibility, color: Colors.orange),
                        onPressed: () async {
                          final updated = AppBanner(
                            id: b.id,
                            title: b.title,
                            subtitle: b.subtitle,
                            image: b.image,
                            link: b.link,
                            active: !b.active,
                            order: b.order,
                            createdAt: b.createdAt,
                          );
                          await fs.updateBanner(updated);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(b.active ? 'Banner deactivated' : 'Banner activated')));
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.edit_outlined, color: Colors.blue),
                        onPressed: () => _showForm(context, fs, banner: b),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () async {
                          final confirm = await showDialog<bool>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: const Text('Delete Banner'),
                              content: Text('Delete "${b.title}"?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                              ],
                            ),
                          );
                          if (confirm == true) {
                            await fs.deleteBanner(b.id);
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Banner deleted')));
                          }
                        },
                      ),
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

  void _showForm(BuildContext context, FirestoreService fs, {AppBanner? banner}) {
    final titleCtrl = TextEditingController(text: banner?.title ?? '');
    final subtitleCtrl = TextEditingController(text: banner?.subtitle ?? '');
    final imageCtrl = TextEditingController(text: banner?.image ?? '');
    final linkCtrl = TextEditingController(text: banner?.link ?? '');
    final orderCtrl = TextEditingController(text: '${banner?.order ?? 0}');
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(banner == null ? 'Add Banner' : 'Edit Banner'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Title')),
              TextField(controller: subtitleCtrl, decoration: const InputDecoration(labelText: 'Subtitle (optional)')),
              TextField(controller: imageCtrl, decoration: const InputDecoration(labelText: 'Image URL')),
              TextField(controller: linkCtrl, decoration: const InputDecoration(labelText: 'Link (optional)')),
              TextField(controller: orderCtrl, decoration: const InputDecoration(labelText: 'Order'), keyboardType: TextInputType.number),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final b = AppBanner(
                id: banner?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                title: titleCtrl.text.trim(),
                subtitle: subtitleCtrl.text.trim().isEmpty ? null : subtitleCtrl.text.trim(),
                image: imageCtrl.text.trim(),
                link: linkCtrl.text.trim().isEmpty ? null : linkCtrl.text.trim(),
                active: banner?.active ?? true,
                order: int.tryParse(orderCtrl.text.trim()) ?? 0,
                createdAt: banner?.createdAt,
              );
              if (banner == null) {
                await fs.createBanner(b);
              } else {
                await fs.updateBanner(b);
              }
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(banner == null ? 'Banner created' : 'Banner updated')));
              }
            },
            child: Text(banner == null ? 'Create' : 'Update'),
          ),
        ],
      ),
    );
  }
}
