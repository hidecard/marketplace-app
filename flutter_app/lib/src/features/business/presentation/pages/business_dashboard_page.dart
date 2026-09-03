import 'package:flutter/material.dart';

class BusinessDashboardPage extends StatelessWidget {
  const BusinessDashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Business Dashboard')),
      body: const Center(child: Text('Business Dashboard Page')),
    );
  }
}
