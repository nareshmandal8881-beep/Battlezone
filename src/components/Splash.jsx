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
      className={`fixed inset-0 z-[100] bg-black overflow-hidden transition-opacity duration-500 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <img src="/splash-bg.jpg" alt="" className="absolute inset-0 w-full h-full object-cover bg-zoom" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/10 to-black/70" />

      <div className="relative h-full w-full flex flex-col items-center pt-[14vh] px-6 text-center overflow-hidden">
        <img src="/logo512.png" alt="BattleZone" className="w-[min(62vw,300px)] logo-fade splash-glow" />
        <h1 className="rise text-white text-[min(11vw,64px)] mt-3 tracking-[0.04em] whitespace-nowrap" style={{ animationDelay: '.35s' }}>
          BATTLEZONE
        </h1>
        <p className="rise font-mono text-[12px] tracking-[0.35em] text-[#f5b301] mt-2" style={{ animationDelay: '.55s' }}>
          ESPORTS · TOURNAMENTS
        </p>

        <div className="mt-auto mb-[8vh] flex flex-col items-center gap-3">
          <div className="w-44 h-[3px] bg-white/15 overflow-hidden">
            <div className="h-full bg-[#f5b301] splash-bar" />
          </div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-white/60">LOADING</p>
        </div>
      </div>
    </div>
  );
};

export default Splash;
