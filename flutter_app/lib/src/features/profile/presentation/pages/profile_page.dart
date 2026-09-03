import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: BlocBuilder<AuthCubit, AuthState>(
        builder: (context, state) {
          final user = state.appUser;
          final shop = state.shop;
          if (user == null) {
            return const Center(child: CircularProgressIndicator());
          }
          final initials = user.displayName.isNotEmpty
              ? user.displayName[0].toUpperCase()
              : '?';
          return ListView(
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.15),
                      backgroundImage: user.photoURL != null && user.photoURL!.isNotEmpty
                          ? NetworkImage(user.photoURL!)
                          : null,
                      child: user.photoURL == null || user.photoURL!.isEmpty
                          ? Text(initials, style: TextStyle(fontSize: 28, color: Theme.of(context).colorScheme.primary))
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user.displayName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          if (user.email != null && user.email!.isNotEmpty)
                            Text(user.email!, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            children: [
                              if (user.phoneVerified)
                                _badge(context, 'Phone Verified', Colors.green),
                              if (!user.phoneVerified && user.phoneNumber != null)
                                _badge(context, 'Verify Phone', Colors.orange),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (shop != null)
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  child: ListTile(
                    leading: const Icon(Icons.store, color: Colors.indigo),
                    title: Text(shop.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(shop.verified ? 'Verified shop' : 'Shop pending verification'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.push('/business'),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ElevatedButton.icon(
                    onPressed: () => context.push('/business/create-shop'),
                    icon: const Icon(Icons.add_business),
                    label: const Text('Create Your Shop'),
                  ),
                ),
              const SizedBox(height: 8),
              const Divider(),
              _tile(context, Icons.location_on_outlined, 'Addresses', '/addresses'),
              _tile(context, Icons.favorite_border, 'Favorites', '/favorites'),
              _tile(context, Icons.receipt_long_outlined, 'Orders', '/orders'),
              _tile(context, Icons.local_offer_outlined, 'Offers', '/offers'),
              _tile(context, Icons.chat_bubble_outline, 'Messages', '/chats'),
              _tile(context, Icons.notifications_outlined, 'Notifications', '/notifications'),
              _tile(context, Icons.verified_user_outlined, 'Verify Phone', '/verify-phone'),
              _tile(context, Icons.help_outline, 'Help & Support', '/help'),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout', style: TextStyle(color: Colors.red)),
                onTap: () async {
                  await context.read<AuthCubit>().signOut();
                  if (context.mounted) context.go('/login');
                },
              ),
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Widget _badge(BuildContext context, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
    );
  }

  Widget _tile(BuildContext context, IconData icon, String title, String route) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => context.push(route),
    );
  }
}