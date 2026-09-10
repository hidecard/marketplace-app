import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../features/shared/models/models.dart';

class QRCodeModal extends StatelessWidget {
  final Offer offer;
  final Product? product;

  const QRCodeModal({super.key, required this.offer, this.product});

  static String offerCode(Offer o) => 'OFFER:${o.id}|${o.productId}|${o.price.toStringAsFixed(0)}|${o.status.name}';

  static Future<void> show(BuildContext context, {required Offer offer, Product? product}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => QRCodeModal(offer: offer, product: product),
    );
  }

  @override
  Widget build(BuildContext context) {
    final code = offerCode(offer);
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Text(
            'Offer QR Code',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          if (product != null) ...[
            const SizedBox(height: 4),
            Text(product!.title,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: QrImageView(
              data: code,
              version: QrVersions.auto,
              size: 200,
              backgroundColor: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          SelectableText(
            code,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600], fontSize: 11, fontFamily: 'monospace'),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: code));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Code copied to clipboard')),
                    );
                  },
                  icon: const Icon(Icons.copy, size: 18),
                  label: const Text('Copy'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, size: 18),
                  label: const Text('Close'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
