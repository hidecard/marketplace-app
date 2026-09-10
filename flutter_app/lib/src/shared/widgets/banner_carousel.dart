import 'dart:async';
import 'package:flutter/material.dart';

class BannerCarousel extends StatefulWidget {
  const BannerCarousel({super.key});

  @override
  State<BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<BannerCarousel> {
  int _currentBanner = 0;
  Timer? _timer;
  
  final List<BannerData> _banners = [
    BannerData(
      title: 'Welcome to Marketplace',
      subtitle: 'Buy and sell with trusted verified shops',
      gradientColors: [Colors.blue, Colors.lightBlue],
    ),
    BannerData(
      title: 'Free POS for Sellers',
      subtitle: 'Manage your business with our free tools',
      gradientColors: [Colors.green, Colors.lightGreen],
    ),
    BannerData(
      title: 'Shop with Confidence',
      subtitle: 'All verified shops are trusted and reliable',
      gradientColors: [Colors.orange, Colors.amber],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startAutoRotation();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startAutoRotation() {
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        setState(() {
          _currentBanner = (_currentBanner + 1) % _banners.length;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      margin: const EdgeInsets.only(bottom: 24),
      child: Stack(
        children: [
          // Banner Content
          PageView.builder(
            itemCount: _banners.length,
            onPageChanged: (index) {
              setState(() => _currentBanner = index);
              _timer?.cancel();
              _startAutoRotation();
            },
            itemBuilder: (context, index) {
              final banner = _banners[index];
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: banner.gradientColors,
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          banner.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          banner.subtitle,
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.white70,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
          // Indicator Dots
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: _banners.asMap().entries.map((entry) {
                return GestureDetector(
                  onTap: () {
                    setState(() => _currentBanner = entry.key);
                    _timer?.cancel();
                    _startAutoRotation();
                  },
                  child: Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: entry.key == _currentBanner
                          ? Colors.white
                          : Colors.white.withValues(alpha: 0.5),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class BannerData {
  final String title;
  final String subtitle;
  final List<Color> gradientColors;

  BannerData({
    required this.title,
    required this.subtitle,
    required this.gradientColors,
  });
}