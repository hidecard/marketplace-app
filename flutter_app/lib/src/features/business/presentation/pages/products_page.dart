import 'package:flutter/material.dart';

class BusinessProductsPage extends StatelessWidget {
  const BusinessProductsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
      body: const Center(child: Text('Products Page')),
    );
  }
}
