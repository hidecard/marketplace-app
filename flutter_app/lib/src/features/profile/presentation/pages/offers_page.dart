import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/offer_card.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';

class OffersPage extends StatefulWidget {
  const OffersPage({super.key});

  @override
  State<OffersPage> createState() => _OffersPageState();
}

class _OffersPageState extends State<OffersPage> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final FirestoreService _fs = FirestoreService();
  final Map<String, Product> _productCache = {};

  Future<Product?> _product(String id) async {
    if (_productCache.containsKey(id)) return _productCache[id];
    final p = await _fs.getProduct(id);
    if (p != null) _productCache[id] = p;
    return p;
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final uid = context.read<AuthCubit>().state.appUser?.uid;
    if (uid == null) {
      return const Scaffold(body: Center(child: Text('Not signed in')));
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offers'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [Tab(text: 'Sent'), Tab(text: 'Received')],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _OfferList(
            uid: uid,
            productFetcher: _product,
            onAccept: null,
            onReject: null,
            isReceived: false,
          ),
          _OfferList(
            uid: uid,
            productFetcher: _product,
            isReceived: true,
            onAccept: (o) async {
              await _fs.updateOfferStatus(o.id, OfferStatus.accepted);
            },
            onReject: (o) async {
              await _fs.updateOfferStatus(o.id, OfferStatus.rejected);
            },
          ),
        ],
      ),
    );
  }
}

class _OfferList extends StatelessWidget {
  final String uid;
  final Future<Product?> Function(String) productFetcher;
  final bool isReceived;
  final Future<void> Function(Offer)? onAccept;
  final Future<void> Function(Offer)? onReject;

  const _OfferList({
    required this.uid,
    required this.productFetcher,
    required this.isReceived,
    this.onAccept,
    this.onReject,
  });

  bool _matches(Offer o) => isReceived ? o.sellerId == uid : o.buyerId == uid;

  @override
  Widget build(BuildContext context) {
    final fs = FirestoreService();
    return StreamBuilder<List<Offer>>(
      stream: fs.offersByUserStream(uid),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        final all = (snap.data ?? []).where(_matches).toList();
        if (all.isEmpty) {
          return EmptyState(
            icon: Icons.local_offer_outlined,
            title: isReceived ? 'No received offers' : 'No sent offers',
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: all.length,
          itemBuilder: (_, i) {
            final o = all[i];
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  FutureBuilder<Product?>(
                    future: productFetcher(o.productId),
                    builder: (context, ps) {
                      final p = ps.data;
                      return Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 4),
                        child: Text(
                          p?.title ?? 'Product',
                          style: TextStyle(color: Colors.grey[700], fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      );
                    },
                  ),
                  OfferCard(
                    offer: o,
                    onAccept: onAccept == null ? null : () => onAccept!(o),
                    onReject: onReject == null ? null : () => onReject!(o),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, top: 4),
                    child: Text(
                      _time(o.createdAt),
                      style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  String _time(DateTime? t) {
    if (t == null) return '';
    return DateFormat('MMM d, HH:mm').format(t);
  }
}