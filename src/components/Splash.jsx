import React, { useEffect, useState } from 'react';

// Full-screen intro shown on first load (and while Firebase restores the session).
const Splash = ({ done }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => setLeaving(true), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [done]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-500 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex items-center gap-3 splash-in">
        <span className="w-12 h-12 bg-ink text-white grid place-items-center text-[20px] font-black">BZ</span>
        <span className="display text-[48px] sm:text-[60px]">BattleZone</span>
      </div>
      <p className="eyebrow mt-4 splash-in" style={{ animationDelay: '120ms' }}>Play · Compete · Win</p>
      <div className="mt-8 w-40 h-[3px] bg-[#ebe8e1] overflow-hidden">
        <div className="h-full bg-ink splash-bar" />
      </div>
    </div>
  );
};

export default Splash;
