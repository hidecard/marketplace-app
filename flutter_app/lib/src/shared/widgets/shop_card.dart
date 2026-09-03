import 'package:flutter/material.dart';
import '../../features/shared/models/models.dart';

class ShopCard extends StatelessWidget {
  final Shop shop;
  final VoidCallback onTap;

  const ShopCard({super.key, required this.shop, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundImage: shop.logo != null ? NetworkImage(shop.logo!) : null,
                child: shop.logo == null ? Text(shop.name[0]) : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(shop.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text(shop.city, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  ],
                ),
              ),
              if (shop.verified)
                const Icon(Icons.verified, color: Color(0xFF2563EB), size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
