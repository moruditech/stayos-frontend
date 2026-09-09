'use client';

import { api } from '@stayos/api-client';

export type PushSetupResult = 'granted' | 'denied' | 'unsupported' | 'unconfigured' | 'error';

/**
 * Requests browser notification permission and, if granted, registers this
 * device for push delivery (see notifications.routes.js#POST /devices and
 * notification.service.js#sendPushToRecipient on the backend).
 *
 * Requires a Firebase project's web config in NEXT_PUBLIC_FIREBASE_* env
 * vars (see .env.example) AND the same config inlined in
 * public/firebase-messaging-sw.js (that file can't read env vars — see the
 * comment in it). Without those, this quietly returns 'unconfigured' rather
 * than throwing — chat and everything else keeps working via in-app/socket
 * delivery either way; push is additive, never required.
 *
 * SECURITY NOTE: only ever pass generic, non-content strings through this
 * path — see the note in firebase-messaging-sw.js. This file has no access
 * to message plaintext or channel keys and isn't where that boundary is
 * enforced anyway (the backend never puts content in the payload to begin
 * with), but it's worth repeating at every layer that touches push.
 */
export async function enablePushNotifications(): Promise<PushSetupResult> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';

  const apiKey = process.env['NEXT_PUBLIC_FIREBASE_API_KEY'];
  const authDomain = process.env['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'];
  const projectId = process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'];
  const storageBucket = process.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'];
  const messagingSenderId = process.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'];
  const appId = process.env['NEXT_PUBLIC_FIREBASE_APP_ID'];
  const vapidKey = process.env['NEXT_PUBLIC_FIREBASE_VAPID_KEY'];
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId || !vapidKey) {
    return 'unconfigured';
  }
  const config = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, isSupported, getToken } = await import('firebase/messaging');

    if (!(await isSupported())) return 'unsupported';

    const app = getApps()[0] ?? initializeApp(config);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return 'denied';

    await api.notifications.registerDevice(token, 'web');
    return 'granted';
  } catch {
    return 'error';
  }
}
