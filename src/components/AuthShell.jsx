import React from 'react';
import { isApp } from '../lib/native';

export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const Divider = () => (
  <div className="flex items-center gap-3 my-5">
    <div className="flex-1 h-px bg-line" />
    <span className="eyebrow">or with email</span>
    <div className="flex-1 h-px bg-line" />
  </div>
);

// App version: logo on black up top, form below — no website chrome.
const AppAuth = ({ kicker, title, children }) => (
  <div className="min-h-screen flex flex-col bg-white">
    <div className="bg-black flex flex-col items-center pt-10 pb-6">
      <img src="/logo512.png" alt="BattleZone" className="w-44 h-44 object-contain splash-glow" />
    </div>
    <div className="flex-1 px-5 pt-6 pb-10 -mt-3 bg-white border-t-4 border-[#f5b301] page-anim">
      <p className="eyebrow mb-1">{kicker}</p>
      <h1 className="text-[36px] mb-5">{title}</h1>
      {children}
    </div>
  </div>
);

// Website version: dark panel on the left (desktop only), form on the right.
const AuthShell = (props) => (isApp ? <AppAuth {...props} /> : <WebAuth {...props} />);

const WebAuth = ({ kicker, title, children }) => (
  <div className="grid md:grid-cols-[1fr_1.1fr] min-h-[calc(100vh-180px)]">
    <aside className="hidden md:flex flex-col justify-between bg-black text-white p-10">
      <img src="/logo192.png" alt="BattleZone" className="w-24 h-24 object-cover" />
      <div>
        <p className="display text-[64px] leading-[0.95]">Your slot.<br />Your room.<br /><span className="text-accent">Your win.</span></p>
        <ul className="mt-8 space-y-2 text-[14px] text-[#cfccc4]">
          <li>— Join paid or free custom rooms</li>
          <li>— Room ID &amp; password shown here when the match goes live</li>
          <li>— Track wins, kills and earnings</li>
        </ul>
      </div>
      <p className="font-mono text-[11px] text-[#7d7a73]">Secured with Firebase Authentication</p>
    </aside>
    <section className="flex items-center justify-center px-4 sm:px-10 py-12">
      <div className="w-full max-w-[380px]">
        <img src="/logo192.png" alt="" className="w-16 h-16 object-cover border border-ink mb-5 md:hidden" />
        <p className="eyebrow mb-2">{kicker}</p>
        <h1 className="text-[44px] mb-7">{title}</h1>
        {children}
      </div>
    </section>
  </div>
);

export default AuthShell;
