import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  Future<String> uploadFile({
    required File file,
    required String path,
    String? contentType,
  }) async {
    final ref = _storage.ref().child(path);
    final uploadTask = ref.putFile(
      file,
      SettableMetadata(contentType: contentType),
    );
    final snapshot = await uploadTask;
    return await snapshot.ref.getDownloadURL();
  }

  Future<String> uploadImage(File file, String folder) async {
    final ext = file.path.split('.').last.toLowerCase();
    final fileName = '${DateTime.now().millisecondsSinceEpoch}.$ext';
    final path = '$folder/$fileName';
    final contentType = ext == 'png' ? 'image/png' : 'image/jpeg';
    return uploadFile(file: file, path: path, contentType: contentType);
  }

  Future<List<String>> uploadImages(List<File> files, String folder) async {
    final urls = <String>[];
    for (var i = 0; i < files.length; i++) {
      final file = files[i];
      final ext = file.path.split('.').last.toLowerCase();
      final fileName = '${DateTime.now().millisecondsSinceEpoch}_$i.$ext';
      final path = '$folder/$fileName';
      final contentType = ext == 'png' ? 'image/png' : 'image/jpeg';
      urls.add(await uploadFile(file: file, path: path, contentType: contentType));
    }
    return urls;
  }

  Future<void> deleteFile(String url) async {
    try {
      final ref = _storage.refFromURL(url);
      await ref.delete();
    } catch (_) {}
  }
}