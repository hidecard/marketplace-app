import 'package:flutter/material.dart';

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final int cartCount;
  final int notificationCount;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.cartCount = 0,
    this.notificationCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: onTap,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600),
        items: [
          const BottomNavigationBarItem(
            icon: _NavIcon(icon: Icons.home_outlined, activeIcon: Icons.home, isActive: false),
            activeIcon: _NavIcon(icon: Icons.home, activeIcon: Icons.home, isActive: true),
            label: 'Home',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.search),
            activeIcon: Icon(Icons.search, size: 28),
            label: 'Search',
          ),
          BottomNavigationBarItem(
            icon: _BadgedIcon(icon: Icons.favorite_border, count: 0, isActive: false),
            activeIcon: _BadgedIcon(icon: Icons.favorite, count: 0, isActive: true),
            label: 'Favorites',
          ),
          BottomNavigationBarItem(
            icon: _BadgedIcon(icon: Icons.shopping_bag_outlined, count: cartCount, isActive: false),
            activeIcon: _BadgedIcon(icon: Icons.shopping_bag, count: cartCount, isActive: true),
            label: 'Orders',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person, size: 28),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class _NavIcon extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final bool isActive;
  const _NavIcon({required this.icon, required this.activeIcon, required this.isActive});

  @override
  Widget build(BuildContext context) {
    return Icon(isActive ? activeIcon : icon, size: isActive ? 26 : 24);
  }
}

class _BadgedIcon extends StatelessWidget {
  final IconData icon;
  final int count;
  final bool isActive;
  const _BadgedIcon({required this.icon, required this.count, required this.isActive});

  @override
  Widget build(BuildContext context) {
    final base = Icon(icon, size: isActive ? 26 : 24);
    if (count <= 0) return base;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        base,
        Positioned(
          right: -6,
          top: -4,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
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

class NavRoutes {
  static const home = '/';
  static const search = '/search';
  static const favorites = '/favorites';
  static const orders = '/orders';
  static const profile = '/profile';

  static int indexFor(String location) {
    if (location.startsWith('/search')) return 1;
    if (location.startsWith('/favorites')) return 2;
    if (location.startsWith('/orders') || location.startsWith('/cart')) return 3;
    if (location.startsWith('/profile') || location.startsWith('/offers') || location.startsWith('/notifications') || location.startsWith('/business')) return 4;
    return 0;
  }
}
