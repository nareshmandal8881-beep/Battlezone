import React, { useEffect, useState } from 'react';
import { hideNativeSplash } from '../lib/native';

// Full-screen intro shown on launch (and while Firebase restores the session).
const Splash = ({ done }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => { hideNativeSplash(); }, []);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setLeaving(true), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [done]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <img src="/logo512.png" alt="BattleZone" className="w-[260px] sm:w-[320px] splash-glow" />
      <div className="mt-6 w-40 h-[3px] bg-white/15 overflow-hidden">
        <div className="h-full bg-[#f5b301] splash-bar" />
      </div>
    </div>
  );
};

export default Splash;
