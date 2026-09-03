import 'package:flutter/material.dart';

class ProductFormPage extends StatelessWidget {
  final String? productId;

  const ProductFormPage({super.key, this.productId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Product Form')),
      body: const Center(child: Text('Product Form Page')),
    );
  }
}
