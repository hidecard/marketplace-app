import 'package:flutter/material.dart';

class _ShimmerBox extends StatefulWidget {
  final double? width;
  final double height;
  const _ShimmerBox({this.width, this.height = 16});

  @override
  State<_ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<_ShimmerBox> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))..repeat(reverse: true);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, _) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Color.lerp(Colors.grey[300], Colors.grey[100], _ctrl.value),
            borderRadius: BorderRadius.circular(4),
          ),
        );
      },
    );
  }
}

class LoadingShimmer extends StatelessWidget {
  final int itemCount;

  const LoadingShimmer({super.key, this.itemCount = 3});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: itemCount,
      itemBuilder: (context, index) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                _ShimmerBox(width: double.infinity),
                SizedBox(height: 8),
                _ShimmerBox(width: 200),
              ],
            ),
          ),
        );
      },
    );
  }
}

class ProductCardShimmer extends StatelessWidget {
  const ProductCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          AspectRatio(
            aspectRatio: 1,
            child: _ShimmerBox(width: double.infinity, height: double.infinity),
          ),
          Padding(
            padding: EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _ShimmerBox(width: double.infinity),
                SizedBox(height: 6),
                _ShimmerBox(width: 80),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CategoryShimmer extends StatelessWidget {
  const CategoryShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 70,
      child: Column(
        children: const [
          _ShimmerBox(width: 56, height: 56),
          SizedBox(height: 6),
          _ShimmerBox(width: 50, height: 10),
        ],
      ),
    );
  }
}

class ShopCardShimmer extends StatelessWidget {
  const ShopCardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: const [
            _ShimmerBox(width: 56, height: 56),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ShimmerBox(width: 120),
                  SizedBox(height: 8),
                  _ShimmerBox(width: 80),
                  SizedBox(height: 6),
                  _ShimmerBox(width: 100),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
