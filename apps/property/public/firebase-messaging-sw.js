// Handles push notifications delivered while no tab has focus. Firebase's
// JS SDK requires this file to exist at the origin root (not just anywhere
// under /public) — see push-notifications.ts, which registers it.
//
// SETUP REQUIRED: replace the placeholder config below with your Firebase
// project's actual web config (Firebase Console → Project settings → Your
// apps → Web app → SDK setup and configuration). This file can't read
// Next.js environment variables (it's served as a static, unbundled file),
// so the values have to be inlined here directly. These are all public
// client identifiers already visible in any Firebase web app's bundle —
// nothing secret goes in this file.
//
// SECURITY NOTE (staff chat specifically): notification.service.js on the
// backend deliberately never puts message content in a push payload's
// title/body — only generic text like "New message in Housekeeping". That
// is what keeps push notifications compatible with end-to-end encryption:
// this service worker (and Firebase's servers in between) only ever see
// that generic text, never anything decrypted from a message.

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'REPLACE_WITH_YOUR_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_YOUR_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_WITH_YOUR_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_YOUR_PROJECT.appspot.com',
  messagingSenderId: 'REPLACE_WITH_YOUR_SENDER_ID',
  appId: 'REPLACE_WITH_YOUR_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? payload.data?.title ?? 'StayOS';
  const body = payload.notification?.body ?? payload.data?.body ?? '';

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    data: payload.data ?? {},
  });
});

// Clicking the notification focuses an existing tab if one is open,
// otherwise opens a new one to the chat page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/chat');
      return undefined;
    })
  );
});
