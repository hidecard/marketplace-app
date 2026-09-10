import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool showBack;
  final bool showSearch;
  final bool showNotifications;
  final bool showCart;
  final int cartCount;
  final int notificationCount;

  const AppHeader({
    super.key,
    this.title = 'Marketplace',
    this.showBack = false,
    this.showSearch = true,
    this.showNotifications = true,
    this.showCart = true,
    this.cartCount = 0,
    this.notificationCount = 0,
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      foregroundColor: Colors.black87,
      elevation: 1,
      automaticallyImplyLeading: showBack,
      titleSpacing: showBack ? 0 : 16,
      title: showBack
          ? Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600))
          : Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text('M',
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                  ),
                ),
                const SizedBox(width: 10),
                const Text('Marketplace',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              ],
            ),
      actions: [
        if (showSearch)
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => context.push('/search'),
          ),
        if (showNotifications)
          _IconWithBadge(
            icon: Icons.notifications_outlined,
            count: notificationCount,
            onTap: () => context.push('/notifications'),
          ),
        if (showCart)
          _IconWithBadge(
            icon: Icons.shopping_cart_outlined,
            count: cartCount,
            onTap: () => context.push('/cart'),
          ),
        const SizedBox(width: 4),
      ],
    );
  }
}

class _IconWithBadge extends StatelessWidget {
  final IconData icon;
  final int count;
  final VoidCallback onTap;
  const _IconWithBadge({required this.icon, required this.count, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        IconButton(icon: Icon(icon), onPressed: onTap),
        if (count > 0)
          Positioned(
            right: 6,
            top: 6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                count > 99 ? '99+' : '$count',
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
