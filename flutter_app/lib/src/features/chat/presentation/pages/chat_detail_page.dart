import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/chat_bubble.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';
import '../cubit/chat_cubit.dart';

class ChatDetailPage extends StatefulWidget {
  final String chatId;
  const ChatDetailPage({super.key, required this.chatId});

  @override
  State<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends State<ChatDetailPage> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FirestoreService _fs = FirestoreService();
  Chat? _chat;
  Product? _product;

  @override
  void initState() {
    super.initState();
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid != null) {
      context.read<ChatCubit>().loadMessages(widget.chatId);
    }
    _fs.chatStream(widget.chatId).listen((c) {
      if (!mounted) return;
      setState(() => _chat = c);
      if (c?.productId != null) {
        _fs.getProduct(c!.productId!).then((p) {
          if (!mounted) return;
          setState(() => _product = p);
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _send() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    context.read<ChatCubit>().sendMessage(widget.chatId, text);
    _controller.clear();
    Future.delayed(const Duration(milliseconds: 200), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  String _otherName(String me, Map<String, AppUser> cache, {String fallback = 'User'}) {
    if (_chat == null) return fallback;
    final other = _chat!.participants.firstWhere(
      (p) => p != me,
      orElse: () => me,
    );
    return cache[other]?.displayName ?? fallback;
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthCubit>().state.appUser?.uid ?? '';
    return Scaffold(
      appBar: AppBar(
        title: Text(_otherName(me, const {})),
        actions: [
          if (_product != null)
            IconButton(
              icon: const Icon(Icons.shopping_bag_outlined),
              tooltip: 'View product',
              onPressed: () => context.push('/product/${_product!.id}'),
            ),
        ],
      ),
      body: Column(
        children: [
          if (_product != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
              child: InkWell(
                onTap: () => context.push('/product/${_product!.id}'),
                child: Row(
                  children: [
                    if (_product!.images.isNotEmpty)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Image.network(
                          _product!.images.first,
                          width: 48,
                          height: 48,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            width: 48,
                            height: 48,
                            color: Colors.grey[200],
                            child: const Icon(Icons.image),
                          ),
                        ),
                      ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _product!.title,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'View product',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: BlocBuilder<ChatCubit, ChatsState>(
              builder: (context, state) {
                if (state.isLoading && state.messages.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (state.messages.isEmpty) {
                  return const EmptyState(
                    icon: Icons.chat_bubble_outline,
                    title: 'No messages',
                    message: 'Send a message to start the conversation.',
                  );
                }
                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: state.messages.length,
                  itemBuilder: (_, i) {
                    final m = state.messages[i];
                    final isMine = m.senderId == me;
                    return ChatBubble(message: m, isMine: isMine, currentUserId: me);
                  },
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey[200]!)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: Colors.grey[100],
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _send,
                    icon: const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}