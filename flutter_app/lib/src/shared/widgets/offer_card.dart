import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../features/shared/models/models.dart';

class OfferCard extends StatelessWidget {
  final Offer offer;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onCounter;

  const OfferCard({
    super.key,
    required this.offer,
    this.onAccept,
    this.onReject,
    this.onCounter,
  });

  Color _statusColor() {
    switch (offer.status) {
      case OfferStatus.pending:
        return const Color(0xFFF59E0B);
      case OfferStatus.accepted:
        return const Color(0xFF10B981);
      case OfferStatus.rejected:
        return const Color(0xFFEF4444);
      case OfferStatus.countered:
        return const Color(0xFF2563EB);
      case OfferStatus.expired:
        return Colors.grey;
    }
  }

  String _statusLabel() {
    switch (offer.status) {
      case OfferStatus.pending:
        return 'Pending';
      case OfferStatus.accepted:
        return 'Accepted';
      case OfferStatus.rejected:
        return 'Rejected';
      case OfferStatus.countered:
        return 'Countered';
      case OfferStatus.expired:
        return 'Expired';
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: '', decimalDigits: 0);
    final color = _statusColor();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.local_offer, color: color, size: 20),
                    const SizedBox(width: 8),
                    const Text('Offer', style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _statusLabel(),
                    style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${fmt.format(offer.price)} Ks',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            if (offer.status == OfferStatus.pending && onAccept != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onReject,
                      child: const Text('Reject'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (onCounter != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onCounter,
                        child: const Text('Counter'),
                      ),
                    ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onAccept,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                      ),
                      child: const Text('Accept'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}