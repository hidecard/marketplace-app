import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../features/shared/models/models.dart';

class OfferCard extends StatelessWidget {
  final Offer offer;
  final String type; // 'sent' or 'received'
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onCounter;

  const OfferCard({
    super.key,
    required this.offer,
    required this.type,
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
    final dateFmt = DateFormat('MMM dd, yyyy');
    final color = _statusColor();
    
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with type, status, and date
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Text(
                      type == 'sent' ? 'Sent Offer' : 'Received Offer',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        _statusLabel(),
                        style: TextStyle(
                          color: color,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  offer.createdAt != null ? dateFmt.format(offer.createdAt!) : '',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 11,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Offer Price
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Offer Price',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${fmt.format(offer.price)} Ks',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            // Action buttons for received pending offers
            if (type == 'received' && offer.status == OfferStatus.pending) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  if (onAccept != null)
                    Expanded(
                      child: ElevatedButton(
                        onPressed: onAccept,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Accept'),
                      ),
                    ),
                  if (onAccept != null && onReject != null) const SizedBox(width: 8),
                  if (onReject != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onReject,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                        ),
                        child: const Text('Reject'),
                      ),
                    ),
                  if (onCounter != null) const SizedBox(width: 8),
                  if (onCounter != null)
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onCounter,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Theme.of(context).colorScheme.primary,
                          side: BorderSide(color: Theme.of(context).colorScheme.primary),
                        ),
                        child: const Text('Counter'),
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