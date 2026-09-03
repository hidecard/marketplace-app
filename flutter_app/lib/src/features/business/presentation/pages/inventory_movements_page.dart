import 'package:flutter/material.dart';

class InventoryMovementsPage extends StatelessWidget {
  const InventoryMovementsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory Movements')),
      body: const Center(child: Text('Inventory Movements Page')),
    );
  }
}
