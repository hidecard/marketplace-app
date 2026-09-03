import 'package:flutter/material.dart';

class BusinessOrdersPage extends StatelessWidget {
  const BusinessOrdersPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: const Center(child: Text('Orders Page')),
    );
  }
}
