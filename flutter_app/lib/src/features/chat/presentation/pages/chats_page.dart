import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';
import '../cubit/chat_cubit.dart';

class ChatsPage extends StatefulWidget {
  const ChatsPage({super.key});

  @override
  State<ChatsPage> createState() => _ChatsPageState();
}

class _ChatsPageState extends State<ChatsPage> {
  final FirestoreService _fs = FirestoreService();
  final Map<String, AppUser> _userCache = {};

  @override
  void initState() {
    super.initState();
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid != null) {
      context.read<ChatCubit>().loadChats(uid);
    }
  }

  Future<AppUser?> _userFor(String uid) async {
    if (_userCache.containsKey(uid)) return _userCache[uid];
    final u = await _fs.getUser(uid);
    if (u != null) _userCache[uid] = u;
    return u;
  }

  String _formatTime(DateTime? t) {
    if (t == null) return '';
    final now = DateTime.now();
    if (now.difference(t).inDays > 0) {
      return DateFormat('MMM d').format(t);
    }
    return DateFormat('HH:mm').format(t);
  }

  @override
  Widget build(BuildContext context) {
    final me = context.read<AuthCubit>().state.appUser?.uid ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('Chats')),
      body: BlocBuilder<ChatCubit, ChatsState>(
        builder: (context, state) {
          if (state.isLoading && state.chats.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state.chats.isEmpty) {
            return const EmptyState(
              icon: Icons.chat_bubble_outline,
              title: 'No conversations yet',
              message: 'Start chatting with sellers from product pages.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              context.read<ChatCubit>().loadChats(me);
            },
            child: ListView.separated(
              itemCount: state.chats.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final chat = state.chats[i];
                final otherId = chat.participants.firstWhere(
                  (p) => p != me,
                  orElse: () => me,
                );
                return FutureBuilder<AppUser?>(
                  future: _userFor(otherId),
                  builder: (context, snap) {
                    final name = snap.data?.displayName ?? 'User';
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: TextStyle(color: Theme.of(context).colorScheme.primary),
                        ),
                      ),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(
                        chat.lastMessage ?? 'No messages yet',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Text(
                        _formatTime(chat.lastMessageAt),
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      onTap: () => context.push('/chats/${chat.id}'),
                    );
                  },
                );
              },
            ),
          );
        },
      ),
    );
  }
}