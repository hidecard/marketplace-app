import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid == null) {
      return const Scaffold(body: Center(child: Text('Not signed in')));
    }
    final fs = FirestoreService();
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: StreamBuilder<List<AppNotification>>(
        stream: fs.notificationsStream(uid),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final list = snap.data ?? [];
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.notifications_off_outlined,
              title: 'No notifications yet',
            );
          }
          return ListView.separated(
            itemCount: list.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final n = list[i];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: n.read
                      ? Colors.grey[300]
                      : Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
                  child: Icon(
                    _iconFor(n.type),
                    color: n.read ? Colors.grey[600] : Theme.of(context).colorScheme.primary,
                  ),
                ),
                title: Text(
                  n.title,
                  style: TextStyle(fontWeight: n.read ? FontWeight.normal : FontWeight.w600),
                ),
                subtitle: Text(
                  '${n.body}\n${_formatTime(n.createdAt)}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                isThreeLine: true,
                trailing: n.read
                    ? null
                    : Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                onTap: () async {
                  if (!n.read) {
                    await fs.markNotificationRead(n.id);
                  }
                  _onTap(context, n);
                },
              );
            },
          );
        },
      ),
    );
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'order':
        return Icons.receipt_long_outlined;
      case 'offer':
        return Icons.local_offer_outlined;
      case 'chat':
        return Icons.chat_bubble_outline;
      case 'review':
        return Icons.star_outline;
      default:
        return Icons.notifications_outlined;
    }
  }

  String _formatTime(DateTime? t) {
    if (t == null) return '';
    final diff = DateTime.now().difference(t);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(t);
  }

  void _onTap(BuildContext context, AppNotification n) {
    final data = n.data ?? const {};
    switch (n.type) {
      case 'order':
        if (data['orderId'] != null) context.push('/orders/${data['orderId']}');
        break;
      case 'offer':
        context.push('/offers');
        break;
      case 'chat':
        if (data['chatId'] != null) context.push('/chats/${data['chatId']}');
        break;
      case 'product':
        if (data['productId'] != null) context.push('/product/${data['productId']}');
        break;
      default:
        break;
    }
  }
}