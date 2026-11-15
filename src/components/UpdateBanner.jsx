import React, { useEffect, useState } from 'react';
import buildInfo from '../buildInfo.json';
import { reloadApp } from '../lib/native';

const CHECK_EVERY_MS = 2 * 60 * 1000; // every 2 minutes

// Shows a bar when a newer version of the site has been deployed.
const UpdateBanner = () => {
  const [newVersion, setNewVersion] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return undefined; // dev server reloads by itself

    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const live = await res.json();
        if (!stopped && live.id && live.id !== buildInfo.id) {
          setNewVersion(true);
          setHidden(false);
        }
      } catch (e) {
        /* offline — try again later */
      }
    };

    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onFocus = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  if (!newVersion || hidden) return null;

  return (
    <div className="fixed bottom-[84px] sm:bottom-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-32px)] max-w-md bg-ink text-white border border-ink flex items-center gap-3 pl-4 pr-2 py-2"
      style={{ boxShadow: '4px 4px 0 #d9461a' }} role="status">
      <span className="text-[14px] flex-1">A new version of BattleZone is available.</span>
      <button onClick={() => setHidden(true)} className="text-[13px] text-[#bdb9b0] hover:text-white px-2 h-9">Later</button>
      <button onClick={reloadApp} className="h-9 px-4 bg-white text-ink text-[13px] font-semibold hover:bg-accent hover:text-white">
        Update
      </button>
    </div>
  );
};

export default UpdateBanner;
