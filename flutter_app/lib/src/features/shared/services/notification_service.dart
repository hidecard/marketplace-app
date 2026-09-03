import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<String?> getToken() async {
    try {
      return await _messaging.getToken();
    } catch (_) {
      return null;
    }
  }

  Future<void> requestPermission() async {
    try {
      await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
    } catch (_) {}
  }

  Future<void> saveToken(String userId) async {
    final token = await getToken();
    if (token == null) return;
    await _db.collection('users').doc(userId).update({'fcmToken': token});
  }

  Future<void> clearToken(String userId) async {
    try {
      await _messaging.deleteToken();
      await _db.collection('users').doc(userId).update({'fcmToken': FieldValue.delete()});
    } catch (_) {}
  }

  Stream<RemoteMessage> get onMessage => FirebaseMessaging.onMessage;
  Stream<String> get onTokenRefresh => FirebaseMessaging.instance.onTokenRefresh;
}