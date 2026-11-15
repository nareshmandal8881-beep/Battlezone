import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { isApp } from './native';

/*
 * Live AdMob ids for BattleZone (App ID is in android/app/src/main/AndroidManifest.xml).
 * For safe testing set TESTING = true, or use Google's test ids:
 *   banner ca-app-pub-3940256099942544/6300978111, interstitial ca-app-pub-3940256099942544/1033173712
 * Never tap your own live ads — AdMob can suspend the account for it.
 */
export const ADS = {
  TESTING: false,
  BANNER_ID: 'ca-app-pub-2818671706434531/3753525593',
  // Add your Interstitial ad unit id here to turn on the full-screen ad after Ludo games.
  INTERSTITIAL_ID: '',
  // Website (Google AdSense) — fill in after AdSense approval, e.g. 'ca-pub-1234567890123456'
  ADSENSE_CLIENT: 'ca-pub-2818671706434531',
};

const TAB_BAR_DP = 66; // keep the banner just above the bottom tab bar
let ready = null;
let bannerShown = false;
let lastInterstitial = 0;

const init = () => {
  if (!isApp) return Promise.resolve(false);
  if (!ready) {
    ready = AdMob.initialize({ initializeForTesting: ADS.TESTING })
      .then(() => true)
      .catch(() => false);
  }
  return ready;
};

export const showBanner = async () => {
  if (!(await init()) || bannerShown) return;
  try {
    await AdMob.showBanner({
      adId: ADS.BANNER_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: TAB_BAR_DP,
      isTesting: ADS.TESTING,
    });
    bannerShown = true;
  } catch (e) { /* no fill / offline */ }
};

export const hideBanner = async () => {
  if (!isApp || !bannerShown) return;
  try { await AdMob.removeBanner(); } catch (e) { /* ignore */ }
  bannerShown = false;
};

// Full-screen ad — at most once every 3 minutes, only at natural breaks (e.g. game over).
export const showInterstitial = async () => {
  if (!ADS.INTERSTITIAL_ID || !(await init())) return;
  if (Date.now() - lastInterstitial < 3 * 60 * 1000) return;
  try {
    await AdMob.prepareInterstitial({ adId: ADS.INTERSTITIAL_ID, isTesting: ADS.TESTING });
    await AdMob.showInterstitial();
    lastInterstitial = Date.now();
  } catch (e) { /* no fill */ }
};

// Pages where the banner would get in the way.
export const NO_BANNER = ['/ludo', '/login', '/register', '/admin/login'];

// Website only: Google AdSense Auto ads (Google picks the spots). Never inside the Android app.
export const loadAdSense = () => {
  if (isApp || !ADS.ADSENSE_CLIENT || document.getElementById('adsense-js')) return;
  const s = document.createElement('script');
  s.id = 'adsense-js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.ADSENSE_CLIENT}`;
  document.head.appendChild(s);
};
