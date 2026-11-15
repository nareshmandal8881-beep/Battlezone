import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { isApp } from './native';

/*
 * Ad settings. These are Google's official TEST ids, so ads show "Test Ad".
 * To earn money: create an AdMob account, add the Android app, then replace
 *   BANNER_ID and INTERSTITIAL_ID below, the APPLICATION_ID in
 *   android/app/src/main/AndroidManifest.xml, and set TESTING = false.
 */
export const ADS = {
  TESTING: true,
  BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712',
  // Website (Google AdSense) — fill in after AdSense approval, e.g. 'ca-pub-1234567890123456'
  ADSENSE_CLIENT: '',
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
  if (!(await init())) return;
  if (Date.now() - lastInterstitial < 3 * 60 * 1000) return;
  try {
    await AdMob.prepareInterstitial({ adId: ADS.INTERSTITIAL_ID, isTesting: ADS.TESTING });
    await AdMob.showInterstitial();
    lastInterstitial = Date.now();
  } catch (e) { /* no fill */ }
};

// Pages where the banner would get in the way.
export const NO_BANNER = ['/ludo', '/login', '/register', '/admin/login'];
