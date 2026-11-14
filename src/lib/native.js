import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';

// true inside the installed Android app, false in a normal browser
export const isApp = Capacitor.isNativePlatform();

export const SITE_URL = 'https://battlezone-51952.web.app';

// Called once on start-up inside the Android app.
export const initNative = (navigate) => {
  if (!isApp) return () => {};

  document.documentElement.classList.add('is-app');
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

  // Android hardware back button: go back inside the app, exit from the main tabs.
  const ROOT_TABS = ['/', '/tournaments', '/leaderboard', '/settings', '/login'];
  const sub = CapApp.addListener('backButton', () => {
    if (ROOT_TABS.includes(window.location.pathname)) CapApp.exitApp();
    else navigate(-1);
  });

  return () => { sub.then((s) => s.remove()).catch(() => {}); };
};

// Hide the native (Android) splash once our own splash is on screen.
export const hideNativeSplash = () => {
  if (isApp) SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
};

export const shareApp = async () => {
  const data = {
    title: 'BattleZone',
    text: 'Join BGMI, Free Fire, COD & Valorant tournaments on BattleZone',
    url: SITE_URL,
  };
  try {
    if (isApp) await Share.share({ ...data, dialogTitle: 'Share BattleZone' });
    else if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(SITE_URL);
      return 'copied';
    }
  } catch (e) { /* user cancelled */ }
  return 'shared';
};
