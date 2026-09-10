import 'dart:async';

import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ChatsState extends Equatable {
  final bool isLoading;
  final List<Chat> chats;
  final Chat? currentChat;
  final List<ChatMessage> messages;
  final bool otherUserTyping;
  final String? error;

  const ChatsState({
    this.isLoading = false,
    this.chats = const [],
    this.currentChat,
    this.messages = const [],
    this.otherUserTyping = false,
    this.error,
  });

  ChatsState copyWith({
    bool? isLoading,
    List<Chat>? chats,
    Chat? currentChat,
    List<ChatMessage>? messages,
    bool? otherUserTyping,
    String? error,
    bool clearError = false,
    bool clearCurrent = false,
  }) {
    return ChatsState(
      isLoading: isLoading ?? this.isLoading,
      chats: chats ?? this.chats,
      currentChat: clearCurrent ? null : (currentChat ?? this.currentChat),
      messages: messages ?? this.messages,
      otherUserTyping: otherUserTyping ?? this.otherUserTyping,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props =>
      [isLoading, chats, currentChat?.id, messages, otherUserTyping, error];
}

class ChatCubit extends Cubit<ChatsState> {
  final FirestoreService _fs = FirestoreService();
  String? _userId;
  Timer? _typingTimer;
  StreamSubscription<Chat?>? _chatSub;
  StreamSubscription<List<ChatMessage>>? _messagesSub;

  ChatCubit() : super(const ChatsState());

  void loadChats(String userId) {
    _userId = userId;
    emit(state.copyWith(isLoading: true, clearError: true));
    _fs.chatsStream(userId).listen(
      (chats) => emit(state.copyWith(isLoading: false, chats: chats)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
  }

  void loadMessages(String chatId) {
    emit(state.copyWith(isLoading: true, clearError: true));
    _messagesSub?.cancel();
    _messagesSub = _fs.messagesStream(chatId).listen(
      (messages) {
        final me = _userId;
        final last = messages.isNotEmpty ? messages.last : null;
        if (me != null && last != null && last.senderId != me && !last.read) {
          // Best-effort: mark incoming messages as read once the user opens the thread.
          _fs.markChatRead(chatId);
        }
        emit(state.copyWith(isLoading: false, messages: messages));
      },
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
    _chatSub?.cancel();
    _chatSub = _fs.chatStream(chatId).listen((c) {
      if (c == null) return;
      final me = _userId;
      bool otherTyping = false;
      if (me != null && c.typing != null) {
        for (final entry in c.typing!.entries) {
          if (entry.key != me) {
            final ts = entry.value is num ? (entry.value as num).toInt() : null;
            if (ts != null && DateTime.now().millisecondsSinceEpoch - ts < 8000) {
              otherTyping = true;
              break;
            }
          }
        }
      }
      emit(state.copyWith(currentChat: c, otherUserTyping: otherTyping));
    });
  }

  Future<String> startChat(String otherUserId, {String? productId}) async {
    if (_userId == null) return '';
    return _fs.createOrGetChat([_userId!, otherUserId], productId: productId);
  }

  Future<void> sendMessage(String chatId, String content,
      {MessageType type = MessageType.text}) async {
    if (_userId == null) return;
    await _fs.sendMessage(
      chatId: chatId,
      senderId: _userId!,
      content: content,
      type: type,
    );
    // Clear our typing indicator on send.
    _fs.setTyping(chatId: chatId, typing: false);
    _typingTimer?.cancel();
  }

  void onTypingChanged(String chatId) {
    if (_userId == null) return;
    _fs.setTyping(chatId: chatId, typing: true);
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 4), () {
      _fs.setTyping(chatId: chatId, typing: false);
    });
  }

  @override
  Future<void> close() {
    _typingTimer?.cancel();
    _chatSub?.cancel();
    _messagesSub?.cancel();
    return super.close();
  }
}
