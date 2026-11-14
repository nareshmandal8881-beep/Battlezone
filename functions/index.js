// Sends every new admin announcement (Firestore "notifications" doc) as a real push
// to all Android app users subscribed to the "all" topic — works with the app closed
// and on the lock screen.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

exports.pushAnnouncement = onDocumentCreated({ document: 'notifications/{id}', region: 'asia-south1' }, async (event) => {
  const n = event.data?.data();
  if (!n?.title) return;
  await getMessaging().send({
    topic: 'all',
    notification: { title: n.title, body: n.body || '' },
    data: { link: n.link || '' },
    android: {
      priority: 'high',
      notification: { channelId: 'alerts', visibility: 'public', defaultSound: true, defaultVibrateTimings: true, color: '#f5b301' },
    },
  });
});
