import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase web config is public by design (it ships in every browser bundle);
// access is protected by Firestore/Storage rules and Auth authorized domains.
// .env values override these defaults if present.
const env = process.env;
const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyDW5YdapcRdlvwQbvJBxqvm1Tzq91SfJok',
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'battlezone-51952.firebaseapp.com',
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID || 'battlezone-51952',
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'battlezone-51952.firebasestorage.app',
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '14532030893',
  appId: env.REACT_APP_FIREBASE_APP_ID || '1:14532030893:web:ad6cf2b7ab7e23b0fb7124',
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Use harmless placeholders when not configured so the UI still renders.
const app = initializeApp(
  isFirebaseConfigured
    ? firebaseConfig
    : { apiKey: 'not-configured', authDomain: 'localhost', projectId: 'not-configured', appId: 'not-configured' }
);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
