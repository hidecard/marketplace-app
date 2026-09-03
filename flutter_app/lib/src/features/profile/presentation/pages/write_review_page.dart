import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../auth/presentation/cubit/auth_cubit.dart';
import '../../../shared/models/models.dart';
import '../../../shared/services/firestore_service.dart';
import '../../../shared/services/storage_service.dart';

class WriteReviewPage extends StatefulWidget {
  final String productId;
  final String shopId;
  final String orderId;
  const WriteReviewPage({
    super.key,
    required this.productId,
    required this.shopId,
    required this.orderId,
  });

  @override
  State<WriteReviewPage> createState() => _WriteReviewPageState();
}

class _WriteReviewPageState extends State<WriteReviewPage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _comment = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  final FirestoreService _fs = FirestoreService();
  final StorageService _storage = StorageService();
  int _rating = 5;
  final List<File> _images = [];
  bool _submitting = false;

  @override
  void dispose() {
    _comment.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked != null && mounted) {
      setState(() => _images.add(File(picked.path)));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    final user = context.read<AuthCubit>().state.appUser;
    if (user == null) {
      setState(() => _submitting = false);
      return;
    }
    try {
      final urls = await _storage.uploadImages(_images, 'reviews/${widget.productId}');
      final id = DateTime.now().millisecondsSinceEpoch.toString();
      final review = Review(
        id: id,
        productId: widget.productId,
        shopId: widget.shopId,
        buyerId: user.uid,
        orderId: widget.orderId,
        rating: _rating,
        comment: _comment.text.trim(),
        images: urls,
      );
      await _fs.createReview(review);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Thank you for your review!')));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Write Review')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(5, (i) {
                    final filled = i < _rating;
                    return IconButton(
                      iconSize: 36,
                      icon: Icon(
                        filled ? Icons.star : Icons.star_border,
                        color: filled ? Colors.amber : Colors.grey,
                      ),
                      onPressed: () => setState(() => _rating = i + 1),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _comment,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Your review',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                validator: (v) => v == null || v.trim().isEmpty ? 'Please write a review' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: _pickImage,
                    icon: const Icon(Icons.add_a_photo_outlined),
                    label: const Text('Add photo'),
                  ),
                  const SizedBox(width: 12),
                  Text('${_images.length} image(s)', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
              if (_images.isNotEmpty) ...[
                const SizedBox(height: 12),
                SizedBox(
                  height: 80,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _images.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(_images[i], width: 80, height: 80, fit: BoxFit.cover),
                        ),
                        Positioned(
                          right: 0,
                          top: 0,
                          child: GestureDetector(
                            onTap: () => setState(() => _images.removeAt(i)),
                            child: const CircleAvatar(
                              radius: 10,
                              backgroundColor: Colors.black54,
                              child: Icon(Icons.close, size: 12, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send),
                label: const Text('Submit Review'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}