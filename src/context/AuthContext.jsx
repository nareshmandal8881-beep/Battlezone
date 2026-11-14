import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import Splash from '../components/Splash';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase/config';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const newProfile = (user, username) => ({
  uid: user.uid,
  username: username || user.displayName || user.email?.split('@')[0] || 'player',
  email: user.email,
  role: 'player',
  createdAt: new Date(),
  tournamentsJoined: [],
  wins: 0,
  totalEarnings: 0,
  kills: 0,
  photoURL: user.photoURL || null,
});

// Turns Firebase error codes into short human messages.
export const authErrorMessage = (err) => {
  const map = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account with that email.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/invalid-email': 'That email address looks wrong.',
    'auth/email-already-in-use': 'An account already uses this email.',
    'auth/weak-password': 'Password needs at least 6 characters.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
    'auth/popup-closed-by-user': 'Google window was closed.',
    'auth/network-request-failed': 'Network problem. Check your connection.',
    'auth/operation-not-allowed': 'This sign-in method is off in Firebase Console.',
    'auth/unauthorized-domain': 'Add this domain in Firebase → Authentication → Settings.',
  };
  if (!isFirebaseConfigured) return 'Firebase keys are missing — add them to .env.';
  return map[err?.code] || 'Something went wrong. Try again.';
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) setUserProfile(snap.data());
    } catch (e) {
      console.error('profile load failed', e);
    }
  };

  const register = async (email, password, username) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: username });
    const profile = newProfile(result.user, username);
    await setDoc(doc(db, 'users', result.user.uid), profile);
    setUserProfile(profile);
    return result;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Creates the Firestore user document the first time someone signs in with Google.
  const ensureProfile = async (user) => {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      setUserProfile(snap.data());
    } else {
      const profile = newProfile(user);
      await setDoc(ref, profile);
      setUserProfile(profile);
    }
  };

  // Returns the signed-in result, or null when we fell back to a full-page redirect.
  const googleSignIn = async () => {
    // Inside the Android app Google blocks web sign-in, so use the phone's native account picker.
    if (Capacitor.isNativePlatform()) {
      const native = await FirebaseAuthentication.signInWithGoogle();
      const idToken = native?.credential?.idToken;
      if (!idToken) throw Object.assign(new Error('no token'), { code: 'auth/popup-closed-by-user' });
      const result = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      await ensureProfile(result.user);
      return result;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureProfile(result.user);
      return result;
    } catch (err) {
      // Popup blocked (common on phones / in-app browsers) → use redirect instead.
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/operation-not-supported-in-this-environment' ||
        err?.code === 'auth/web-storage-unsupported'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw err;
    }
  };

  const [minSplashDone, setMinSplashDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinSplashDone(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return undefined;
    }
    // Finish a Google redirect sign-in if we're coming back from one.
    getRedirectResult(auth)
      .then((res) => res?.user && ensureProfile(res.user))
      .catch((e) => console.error('google redirect failed', e));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) await fetchUserProfile(user.uid);
      else setUserProfile(null);
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [splashGone, setSplashGone] = useState(false);
  const ready = !loading && minSplashDone;
  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setSplashGone(true), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ready]);

  const value = {
    currentUser,
    userProfile,
    loading,
    register,
    login,
    logout,
    googleSignIn,
    resetPassword,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {!splashGone && <Splash done={ready} />}
    </AuthContext.Provider>
  );
};
