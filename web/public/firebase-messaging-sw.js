// Firebase Cloud Messaging service worker for the web app.
// This file is served at /firebase-messaging-sw.js by Vite's `public/` directory.
// It must be a standalone script (no imports from /src/) because service workers
// run in their own global scope. Firebase web config is publishable.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// NOTE: this config is intentionally hardcoded. Firebase web config is designed
// to be public. Keep it in sync with src/services/firebase.ts and web/.env.
firebase.initializeApp({
  apiKey: 'AIzaSyC1-s5R4gzElq4D5NatWkcklF198fTEvRo',
  authDomain: 'padaytharpin-app.firebaseapp.com',
  projectId: 'padaytharpin-app',
  storageBucket: 'padaytharpin-app.firebasestorage.app',
  messagingSenderId: '304535507982',
  appId: '1:304535507982:web:b960bdb0f2bc1652fb985f',
});

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = (payload.notification && payload.notification.title) || 'Marketplace';
    const notificationOptions = {
      body: (payload.notification && payload.notification.body) || '',
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      data: payload.data || {},
      tag: payload.data && payload.data.tag ? String(payload.data.tag) : undefined,
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  // Some browsers / dev environments won't have messaging; fall back to no-op.
  console.warn('[firebase-messaging-sw] background messaging unavailable:', error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          try {
            const url = new URL(targetUrl, client.url);
            client.navigate(url.toString());
            return client.focus();
          } catch (e) {
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
