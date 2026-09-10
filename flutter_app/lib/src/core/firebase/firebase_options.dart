import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static const web = FirebaseOptions(
    apiKey: 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo',
    authDomain: 'padaytharpin-app.firebaseapp.com',
    projectId: 'padaytharpin-app',
    storageBucket: 'padaytharpin-app.firebasestorage.app',
    messagingSenderId: '304535507982',
    appId: '1:304535507982:web:b960bdb0f2bc1652fb985f',
    measurementId: 'G-F7JE4SNWDC',
  );

  static const android = FirebaseOptions(
    apiKey: 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo',
    authDomain: 'padaytharpin-app.firebaseapp.com',
    projectId: 'padaytharpin-app',
    storageBucket: 'padaytharpin-app.firebasestorage.app',
    messagingSenderId: '304535507982',
    appId: '1:304535507982:android:b960bdb0f2bc1652fb985f',
  );

  static const ios = FirebaseOptions(
    apiKey: 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo',
    authDomain: 'padaytharpin-app.firebaseapp.com',
    projectId: 'padaytharpin-app',
    storageBucket: 'padaytharpin-app.firebasestorage.app',
    messagingSenderId: '304535507982',
    appId: '1:304535507982:ios:0000000000000000000000',
    iosBundleId: 'com.marketplace.marketplaceApp',
  );

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }
}
