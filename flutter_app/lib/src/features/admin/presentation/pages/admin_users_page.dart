import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/models/models.dart';
import '../../../../shared/widgets/empty_state.dart';

class AdminUsersPage extends StatelessWidget {
  const AdminUsersPage({super.key});

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    final fmt = DateFormat('MMM dd, yyyy');
    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: StreamBuilder<List<AppUser>>(
        stream: fs.allUsersStream(),
        builder: (context, snap) {
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final users = snap.data!;
          if (users.isEmpty) return const EmptyState(icon: Icons.people_outline, title: 'No users found');
          return ListView.builder(
            itemCount: users.length,
            itemBuilder: (_, i) {
              final u = users[i];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  leading: CircleAvatar(child: Text(u.displayName.isNotEmpty ? u.displayName[0].toUpperCase() : '?')),
                  title: Text(u.displayName),
                  subtitle: Text('${u.email ?? u.phoneNumber ?? 'No contact'} • ${fmt.format(u.createdAt ?? DateTime.now())}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Chip(label: Text(userRoleToString(u.role))),
                      IconButton(
                        icon: Icon(u.status == UserStatus.banned ? Icons.person_off : Icons.person, color: Colors.red),
                        onPressed: () async {
                          final action = await showDialog<String>(
                            context: context,
                            builder: (_) => AlertDialog(
                              title: Text(u.status == UserStatus.banned ? 'Unban User' : 'Ban User'),
                              content: Text(u.status == UserStatus.banned ? 'Allow this user to access the app?' : 'Prevent this user from accessing the app?'),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                TextButton(
                                  onPressed: () => Navigator.pop(context, u.status == UserStatus.banned ? 'unban' : 'ban'),
                                  child: Text(u.status == UserStatus.banned ? 'Unban' : 'Ban'),
                                ),
                              ],
                            ),
                          );
                          if (action == 'ban') {
                            await fs.updateUserStatus(u.uid, UserStatus.banned);
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User banned')));
                          } else if (action == 'unban') {
                            await fs.updateUserStatus(u.uid, UserStatus.active);
                            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('User unbanned')));
                          }
                        },
                      ),
                    ],
                  ),
                  onTap: () => _showDetails(context, u),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showDetails(BuildContext context, AppUser u) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(u.displayName),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Email: ${u.email ?? 'N/A'}'),
            Text('Phone: ${u.phoneNumber ?? 'N/A'}'),
            Text('Role: ${userRoleToString(u.role)}'),
            Text('Status: ${userStatusToString(u.status)}'),
            Text('Phone Verified: ${u.phoneVerified ? 'Yes' : 'No'}'),
            Text('Shop Verified: ${u.shopVerified ? 'Yes' : 'No'}'),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
      ),
    );
  }
}
