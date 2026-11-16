import { AdMob, BannerAdPosition, BannerAdSize, BannerAdPluginEvents } from '@capacitor-community/admob';
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
  ADSENSE_CLIENT: 'ca-pub-2818671706434531',
};

const TAB_BAR_DP = 66; // keep the banner just above the bottom tab bar (dp, plugin scales by density)
const RETRY_MS = 45 * 1000;
let ready = null;
let lastInterstitial = 0;

// Banner state: `want` is what the current page asks for, `on` is what's on screen.
// All show/hide calls run one after another so a quick page change can't leave a banner stuck.
let want = false;
let on = false;
let queue = Promise.resolve();
let retryTimer = null;

const init = () => {
  if (!isApp) return Promise.resolve(false);
  if (!ready) {
    ready = AdMob.initialize({ initializeForTesting: ADS.TESTING })
      .then(() => {
        // No fill / network error → try again a bit later while the page still wants a banner.
        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
          on = false;
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => { if (want) sync(); }, RETRY_MS); // eslint-disable-line no-use-before-define
        }).catch(() => {});
        return true;
      })
      .catch(() => false);
  }
  return ready;
};

const sync = () => {
  queue = queue.then(async () => {
    if (!(await init())) return;
    if (want && !on) {
      try {
        await AdMob.showBanner({
          adId: ADS.BANNER_ID,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: TAB_BAR_DP,
          isTesting: ADS.TESTING,
        });
        on = true;
      } catch (e) { /* offline — FailedToLoad listener retries */ }
    } else if (!want && on) {
      try { await AdMob.removeBanner(); } catch (e) { /* ignore */ }
      on = false;
      clearTimeout(retryTimer);
    }
  });
  return queue;
};

export const showBanner = () => { want = true; return sync(); };
export const hideBanner = () => { want = false; clearTimeout(retryTimer); return isApp ? sync() : Promise.resolve(); };

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

// Website AdSense: the script tag lives in public/index.html; build/app.html (used by the app) has it removed.
