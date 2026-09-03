import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class ChatsState extends Equatable {
  final bool isLoading;
  final List<Chat> chats;
  final Chat? currentChat;
  final List<ChatMessage> messages;
  final String? error;

  const ChatsState({
    this.isLoading = false,
    this.chats = const [],
    this.currentChat,
    this.messages = const [],
    this.error,
  });

  ChatsState copyWith({
    bool? isLoading,
    List<Chat>? chats,
    Chat? currentChat,
    List<ChatMessage>? messages,
    String? error,
    bool clearError = false,
    bool clearCurrent = false,
  }) {
    return ChatsState(
      isLoading: isLoading ?? this.isLoading,
      chats: chats ?? this.chats,
      currentChat: clearCurrent ? null : (currentChat ?? this.currentChat),
      messages: messages ?? this.messages,
      error: clearError ? null : (error ?? this.error),
    );
  }

  @override
  List<Object?> get props => [isLoading, chats, currentChat?.id, messages, error];
}

class ChatCubit extends Cubit<ChatsState> {
  final FirestoreService _fs = FirestoreService();
  String? _userId;

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
    _fs.messagesStream(chatId).listen(
      (messages) => emit(state.copyWith(isLoading: false, messages: messages)),
      onError: (e) => emit(state.copyWith(isLoading: false, error: e.toString())),
    );
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
  }
}