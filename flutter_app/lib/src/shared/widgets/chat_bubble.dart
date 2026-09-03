import 'package:flutter/material.dart';
import '../../features/shared/models/models.dart';

class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isMine;
  final String currentUserId;

  const ChatBubble({
    super.key,
    required this.message,
    required this.isMine,
    required this.currentUserId,
  });

  @override
  Widget build(BuildContext context) {
    final align = isMine ? Alignment.centerRight : Alignment.centerLeft;
    final color = isMine ? Theme.of(context).colorScheme.primary : Colors.grey[200]!;
    final textColor = isMine ? Colors.white : Colors.black87;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      alignment: align,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(12),
              topRight: const Radius.circular(12),
              bottomLeft: Radius.circular(isMine ? 12 : 2),
              bottomRight: Radius.circular(isMine ? 2 : 12),
            ),
          ),
          child: _content(textColor),
        ),
      ),
    );
  }

  Widget _content(Color textColor) {
    switch (message.type) {
      case MessageType.image:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.image, size: 80, color: Colors.white),
            const SizedBox(height: 4),
            Text('Image', style: TextStyle(color: textColor)),
          ],
        );
      case MessageType.product:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.shopping_bag, color: Colors.white, size: 18),
            const SizedBox(width: 6),
            Text('Product', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
          ],
        );
      case MessageType.offer:
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.local_offer, color: Colors.white, size: 18),
            const SizedBox(width: 6),
            Text(message.content, style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
          ],
        );
      case MessageType.text:
        return Text(message.content, style: TextStyle(color: textColor));
      default:
        return Text(message.content, style: TextStyle(color: textColor));
    }
  }
}