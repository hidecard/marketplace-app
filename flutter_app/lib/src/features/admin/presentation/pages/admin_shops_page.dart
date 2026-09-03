import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminShopsPage extends StatelessWidget {
  const AdminShopsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    final fmt = DateFormat('MMM dd, yyyy');
    return Scaffold(
      appBar: AppBar(title: const Text('Shops')),
      body: StreamBuilder<List<Shop>>(
        stream: fs.shopsStream(verifiedOnly: false),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final shops = snap.data!;
          if (shops.isEmpty) return const EmptyState(icon: Icons.store_outlined, title: 'No shops found');
          return ListView.builder(
            itemCount: shops.length,
            itemBuilder: (_, i) {
              final s = shops[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: const Icon(Icons.store),
                  title: Row(
                    children: [
                      Expanded(child: Text(s.name)),
                      if (s.verified) const Icon(Icons.verified, size: 16, color: Colors.blue),
                    ],
                  ),
                  subtitle: Text('${s.city}, ${s.region} • ${fmt.format(s.createdAt ?? DateTime.now())}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(s.verified ? Icons.verified : Icons.verified_outlined, color: Colors.green),
                        onPressed: () async {
                          await fs.updateShopVerified(s.id, !s.verified);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(s.verified ? 'Shop unverified' : 'Shop verified')),
                            );
                          }
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.visibility, color: Colors.blue),
                        onPressed: () => _showDetails(context, s),
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

  void _showDetails(BuildContext context, Shop s) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(s.name),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Owner: ${s.ownerId}'),
            Text('Email: ${s.email}'),
            Text('Phone: ${s.phone}'),
            Text('Address: ${s.address}'),
            Text('City: ${s.city}, ${s.region}'),
            Text('Verified: ${s.verified ? 'Yes' : 'No'}'),
            Text('Status: ${shopVerificationToString(s.verificationStatus)}'),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
      ),
    );
  }
}
