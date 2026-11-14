import { useEffect, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { LocalNotifications } from '@capacitor/local-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { db } from '../firebase/config';
import { isApp } from './native';

const SEEN_KEY = 'bz-notif-seen';

// Flip to true once the `pushAnnouncement` Cloud Function is deployed (needs Firebase Blaze plan).
// Then the server sends real pushes (lock screen, app closed) and we stop showing local duplicates.
export const PUSH_SERVER = false;

const CHANNEL = { id: 'alerts', name: 'Match alerts', description: 'Tournament and room updates', importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#F5B301' };
const ms = (n) => n.createdAt?.toMillis?.() ?? Date.now();

const getSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch (e) { return 0; } };
const setSeen = (t) => { try { localStorage.setItem(SEEN_KEY, String(t)); } catch (e) { /* ignore */ } };

// Admin → everyone.
export const sendNotification = ({ title, body = '', link = '' }) =>
  addDoc(collection(db, 'notifications'), { title, body, link, createdAt: serverTimestamp() });

// Ask once for permission to show phone/browser notifications.
export const askNotificationPermission = async () => {
  try {
    if (isApp) {
      const p = await LocalNotifications.checkPermissions();
      if (p.display !== 'granted') await LocalNotifications.requestPermissions();
      // importance 5 = heads-up banner at the top of the screen, visibility 1 = shown on lock screen
      await LocalNotifications.createChannel(CHANNEL).catch(() => {});
      await FirebaseMessaging.createChannel(CHANNEL).catch(() => {});
      try {
        const fp = await FirebaseMessaging.checkPermissions();
        if (fp.receive !== 'granted') await FirebaseMessaging.requestPermissions();
        await FirebaseMessaging.subscribeToTopic({ topic: 'all' });
      } catch (e) { /* push not available on this build */ }
    } else if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (e) { /* not supported */ }
};

let nativeId = 1;
const showSystem = (n) => {
  try {
    if (isApp) {
      if (PUSH_SERVER) return; // the server push already shows it
      LocalNotifications.schedule({
        notifications: [{ id: nativeId++, title: n.title, body: n.body || ' ', channelId: 'alerts', extra: { link: n.link || '' } }],
      });
    } else if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      const sys = new Notification(n.title, { body: n.body, icon: '/logo192.png' });
      sys.onclick = () => { window.focus(); if (n.link) window.location.assign(n.link); };
    }
  } catch (e) { /* ignore */ }
};

// Single shared live listener for the whole app.
let listeners = new Set();
let latest = [];
let started = false;

const start = () => {
  if (started) return;
  started = true;
  const openedAt = Date.now();
  let first = true;
  onSnapshot(query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(40)), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!first) {
      snap.docChanges().filter((c) => c.type === 'added').forEach((c) => {
        const n = { id: c.doc.id, ...c.doc.data() };
        if (ms(n) >= openedAt - 5000) {
          toast(`🔔 ${n.title}`, { duration: 5000 });
          showSystem(n);
        }
      });
    }
    first = false;
    latest = list;
    listeners.forEach((fn) => fn(list));
  }, () => {});
};

export const useNotifications = () => {
  const [items, setItems] = useState(latest);
  const [seen, setSeenState] = useState(getSeen());
  useEffect(() => {
    start();
    listeners.add(setItems);
    setItems(latest);
    return () => { listeners.delete(setItems); };
  }, []);
  const unread = items.filter((n) => ms(n) > seen).length;
  const markAllSeen = () => { const t = Date.now(); setSeen(t); setSeenState(t); };
  return { items, unread, markAllSeen, seen };
};

// Tap on an Android notification → open its link inside the app.
export const initNotificationTaps = (navigate) => {
  if (!isApp) return;
  FirebaseMessaging.addListener('notificationActionPerformed', (e) => {
    const link = e.notification?.data?.link;
    if (link) navigate(link);
  }).catch(() => {});
  LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const link = e.notification?.extra?.link;
    if (link) navigate(link);
  }).catch(() => {});
};
