import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../shared/widgets/app_header.dart';
import '../../../../shared/widgets/banner_ad.dart';
import '../../../../shared/widgets/banner_carousel.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/loading_shimmer.dart';
import '../../../../shared/widgets/product_card.dart';
import '../../../business/presentation/cubit/shops_cubit.dart';
import '../../../categories/presentation/cubit/categories_cubit.dart';
import '../../../products/presentation/cubit/products_cubit.dart';
import '../../../shared/models/models.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ShopsCubit()..loadVerified(limit: 10)),
      ],
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AppHeader(),
      body: RefreshIndicator(
        onRefresh: () async {
          // Just trigger a small delay so the indicator spins
          await Future.delayed(const Duration(milliseconds: 400));
        },
        child: ListView(
          padding: const EdgeInsets.only(bottom: 24),
          children: const [
            SizedBox(height: 12),
            BannerCarousel(),
            SizedBox(height: 8),
            _CategoriesSection(),
            SizedBox(height: 16),
            _VerifiedShopsSection(),
            SizedBox(height: 16),
            _FeaturedProductsSection(),
            SizedBox(height: 16),
            _RecentProductsSection(),
            SizedBox(height: 16),
            BannerAd(),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const _SectionHeader({required this.title, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          if (actionLabel != null && onAction != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                padding: EdgeInsets.zero,
                minimumSize: const Size(0, 0),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(actionLabel!,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(width: 2),
                  Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.primary, size: 16),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _CategoriesSection extends StatelessWidget {
  const _CategoriesSection();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<CategoriesCubit, CategoriesState>(
      builder: (context, state) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeader(
              title: 'Categories',
              actionLabel: 'See all',
              onAction: () => context.push('/categories'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 90,
              child: state.isLoading && state.categories.isEmpty
                  ? ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: 6,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (_, _) => const CategoryShimmer(),
                    )
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: state.categories.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (context, i) => _CategoryTile(state.categories[i]),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _CategoryTile extends StatelessWidget {
  final Category category;
  const _CategoryTile(this.category);

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    final hasIcon = category.icon != null && category.icon!.isNotEmpty;
    return GestureDetector(
      onTap: () => context.push('/category/${category.id}'),
      child: SizedBox(
        width: 70,
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              clipBehavior: Clip.antiAlias,
              child: hasIcon
                  ? Image.network(
                      category.icon!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _CategoryFallback(letter: category.name.isNotEmpty ? category.name[0] : '?', color: primary),
                    )
                  : _CategoryFallback(letter: category.name.isNotEmpty ? category.name[0] : '?', color: primary),
            ),
            const SizedBox(height: 6),
            Text(
              category.name,
              style: const TextStyle(fontSize: 11),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryFallback extends StatelessWidget {
  final String letter;
  final Color color;
  const _CategoryFallback({required this.letter, required this.color});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        letter.toUpperCase(),
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 20),
      ),
    );
  }
}

class _VerifiedShopsSection extends StatelessWidget {
  const _VerifiedShopsSection();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ShopsCubit, ShopsState>(
      builder: (context, state) {
        if (!state.isLoading && state.shops.isEmpty) {
          return const SizedBox.shrink();
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionHeader(
              title: 'Verified Shops',
              actionLabel: 'See all',
              onAction: () => context.push('/shops'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 130,
              child: state.isLoading
                  ? ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: 4,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (_, _) => const _ShopCircleShimmer(),
                    )
                  : ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: state.shops.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 12),
                      itemBuilder: (context, i) => _ShopCircleCard(state.shops[i]),
                    ),
            ),
          ],
        );
      },
    );
  }
}

class _ShopCircleCard extends StatelessWidget {
  final Shop shop;
  const _ShopCircleCard(this.shop);

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return GestureDetector(
      onTap: () => context.push('/shop/${shop.id}'),
      child: Container(
        width: 90,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(color: Colors.grey[100], shape: BoxShape.circle),
              clipBehavior: Clip.antiAlias,
              child: shop.logo != null && shop.logo!.isNotEmpty
                  ? Image.network(
                      shop.logo!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => Center(
                        child: Text(
                          shop.name.isNotEmpty ? shop.name[0].toUpperCase() : '?',
                          style: TextStyle(color: Colors.grey[400], fontWeight: FontWeight.bold, fontSize: 22),
                        ),
                      ),
                    )
                  : Center(
                      child: Text(
                        shop.name.isNotEmpty ? shop.name[0].toUpperCase() : '?',
                        style: TextStyle(color: Colors.grey[400], fontWeight: FontWeight.bold, fontSize: 22),
                      ),
                    ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    shop.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
                if (shop.verified) ...[
                  const SizedBox(width: 2),
                  Icon(Icons.verified, color: primary, size: 12),
                ],
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.star, color: Colors.amber, size: 11),
                const SizedBox(width: 2),
                Text(
                  shop.rating.toStringAsFixed(1),
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

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
      builder: (_, _) => Container(
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: Color.lerp(Colors.grey[300], Colors.grey[100], _ctrl.value),
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}

class _ShopCircleShimmer extends StatelessWidget {
  const _ShopCircleShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: const Column(
        children: [
          _ShimmerCircle(size: 56),
          SizedBox(height: 8),
          _ShimmerBox(width: 60, height: 10),
          SizedBox(height: 4),
          _ShimmerBox(width: 40, height: 8),
        ],
      ),
    );
  }
}

class _ShimmerCircle extends StatefulWidget {
  final double size;
  const _ShimmerCircle({required this.size});
  @override
  State<_ShimmerCircle> createState() => _ShimmerCircleState();
}

class _ShimmerCircleState extends State<_ShimmerCircle> with SingleTickerProviderStateMixin {
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
      builder: (_, _) => Container(
        width: widget.size,
        height: widget.size,
        decoration: BoxDecoration(
          color: Color.lerp(Colors.grey[300], Colors.grey[100], _ctrl.value),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

class _FeaturedProductsSection extends StatefulWidget {
  const _FeaturedProductsSection();

  @override
  State<_FeaturedProductsSection> createState() => _FeaturedProductsSectionState();
}

class _FeaturedProductsSectionState extends State<_FeaturedProductsSection> {
  late final ProductsCubit _cubit = ProductsCubit()..loadFeatured(limit: 4);

  @override
  void dispose() {
    _cubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocBuilder<ProductsCubit, ProductsState>(
        builder: (context, state) {
          if (!state.isLoading && state.products.isEmpty) {
            return const SizedBox.shrink();
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionHeader(
                title: 'Popular Products',
                actionLabel: 'See all',
                onAction: () => context.push('/search?sort=popular'),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: state.isLoading
                    ? GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.7,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: 4,
                        itemBuilder: (_, _) => const ProductCardShimmer(),
                      )
                    : GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.7,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: state.products.length.clamp(0, 4),
                        itemBuilder: (context, i) => ProductCard(product: state.products[i]),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _RecentProductsSection extends StatefulWidget {
  const _RecentProductsSection();

  @override
  State<_RecentProductsSection> createState() => _RecentProductsSectionState();
}

class _RecentProductsSectionState extends State<_RecentProductsSection> {
  late final ProductsCubit _cubit = ProductsCubit()..loadRecent(limit: 20);

  @override
  void dispose() {
    _cubit.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocProvider.value(
      value: _cubit,
      child: BlocBuilder<ProductsCubit, ProductsState>(
        builder: (context, state) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionHeader(
                title: 'New Arrivals',
                actionLabel: 'See all',
                onAction: () => context.push('/search?sort=newest'),
              ),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: state.isLoading
                    ? GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          childAspectRatio: 0.7,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: 4,
                        itemBuilder: (_, _) => const ProductCardShimmer(),
                      )
                    : state.products.isEmpty
                        ? EmptyState(
                            icon: Icons.shopping_cart_outlined,
                            title: 'No Products Yet',
                            message: 'Be the first to list a product!',
                            actionLabel: 'Add Product',
                            onAction: () => context.push('/business/products/new'),
                          )
                        : GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 0.7,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: state.products.length,
                            itemBuilder: (context, i) => ProductCard(product: state.products[i]),
                          ),
              ),
            ],
          );
        },
      ),
    );
  }
}
