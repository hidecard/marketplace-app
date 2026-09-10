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
  Product? _product;
  AppUser? _otherUser;

  @override
  void initState() {
    super.initState();
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid != null) {
      context.read<ChatCubit>().loadMessages(widget.chatId);
    }
    _fs.chatStream(widget.chatId).listen((c) async {
      if (!mounted || c == null) return;
      if (c.productId != null) {
        final p = await _fs.getProduct(c.productId!);
        if (!mounted) return;
        setState(() => _product = p);
      }
      if (uid != null) {
        final other = c.participants.firstWhere(
          (p) => p != uid,
          orElse: () => '',
        );
        if (other.isNotEmpty) {
          final u = await _fs.getUser(other);
          if (!mounted) return;
          setState(() => _otherUser = u);
        }
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

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthCubit>().state.appUser?.uid ?? '';
    final otherName = _otherUser?.displayName ?? 'User';
    return Scaffold(
      appBar: AppBar(
        title: Text(otherName),
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
            child: BlocConsumer<ChatCubit, ChatsState>(
              listenWhen: (a, b) => a.messages.length != b.messages.length,
              listener: (context, state) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_scrollController.hasClients) {
                    _scrollController.animateTo(
                      _scrollController.position.maxScrollExtent,
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOut,
                    );
                  }
                });
              },
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
          if (context.watch<ChatCubit>().state.otherUserTyping)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _TypingDot(),
                    _TypingDot(delay: 150),
                    _TypingDot(delay: 300),
                    SizedBox(width: 6),
                    Text('typing…', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
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
                      onChanged: (_) =>
                          context.read<ChatCubit>().onTypingChanged(widget.chatId),
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: Colors.grey[100],
                        contentPadding:
                            const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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

class _TypingDot extends StatefulWidget {
  final int delay;
  const _TypingDot({this.delay = 0});
  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 600),
  )..repeat(reverse: true);

  @override
  void initState() {
    super.initState();
    if (widget.delay > 0) {
      Future.delayed(Duration(milliseconds: widget.delay), () {
        if (mounted) _ctrl.repeat(reverse: true);
      });
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, _) => Container(
        width: 6,
        height: 6,
        margin: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: Color.lerp(Colors.grey[300], Colors.grey[700], _ctrl.value),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
