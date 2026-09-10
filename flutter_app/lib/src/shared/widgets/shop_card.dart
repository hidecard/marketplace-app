import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/shared/models/models.dart';

class ShopCard extends StatelessWidget {
  final Shop shop;
  final VoidCallback? onTap;

  const ShopCard({super.key, required this.shop, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap ?? () => context.push('/shop/${shop.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Shop Logo
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: shop.logo != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          shop.logo!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Center(
                            child: Text(
                              shop.name.isNotEmpty ? shop.name[0].toUpperCase() : '?',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[400],
                              ),
                            ),
                          ),
                        ),
                      )
                    : Center(
                        child: Text(
                          shop.name.isNotEmpty ? shop.name[0].toUpperCase() : '?',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[400],
                          ),
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              // Shop Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Shop Name with Verification Badge
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            shop.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (shop.verified)
                          Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: Icon(
                              Icons.verified,
                              color: Theme.of(context).colorScheme.primary,
                              size: 16,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Rating
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          shop.rating.toStringAsFixed(1),
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                        if (shop.totalReviews > 0) ...[
                          const SizedBox(width: 4),
                          Text(
                            '(${shop.totalReviews})',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Location
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.grey, size: 12),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            shop.city,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
