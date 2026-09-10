import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../features/shared/models/models.dart';

class ProductCard extends StatelessWidget {
  final Product product;
  final bool isFavorite;
  final VoidCallback? onFavoriteToggle;

  const ProductCard({
    super.key,
    required this.product,
    this.isFavorite = false,
    this.onFavoriteToggle,
  });

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: '', decimalDigits: 0);
    
    // Calculate discount percentage
    int? discountPercentage;
    if (product.comparePrice != null && product.comparePrice! > product.price) {
      discountPercentage = ((product.comparePrice! - product.price) / product.comparePrice! * 100).round();
    }
    
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/product/${product.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1,
                  child: (product.images.isNotEmpty ? product.images.first : '').isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: product.images.isNotEmpty ? product.images.first : '',
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(color: Colors.grey[200]),
                          errorWidget: (context, url, error) => Container(
                            color: Colors.grey[200],
                            child: const Icon(Icons.image, color: Colors.grey),
                          ),
                        )
                      : Container(
                          color: Colors.grey[200],
                          child: const Icon(Icons.image, color: Colors.grey),
                        ),
                ),
                // Condition badge (yellow for used items)
                if (product.condition == ProductCondition.used)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Used',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                // Discount percentage badge
                if (discountPercentage != null && discountPercentage > 0)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '-$discountPercentage%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                // Favorite button
                if (onFavoriteToggle != null)
                  Positioned(
                    top: discountPercentage != null ? 40 : 8,
                    right: 8,
                    child: Material(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: const CircleBorder(),
                      child: IconButton(
                        iconSize: 18,
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        icon: Icon(
                          isFavorite ? Icons.favorite : Icons.favorite_border,
                          color: isFavorite ? Colors.red : Colors.grey[700],
                        ),
                        onPressed: onFavoriteToggle,
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '${fmt.format(product.price)} Ks',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 14,
                        ),
                      ),
                      if (product.comparePrice != null && product.comparePrice! > product.price) ...[
                        const SizedBox(width: 4),
                        Text(
                          '${fmt.format(product.comparePrice)} Ks',
                          style: TextStyle(
                            fontWeight: FontWeight.normal,
                            color: Colors.grey[400],
                            fontSize: 12,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}