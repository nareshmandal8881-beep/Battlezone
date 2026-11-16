import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { notificationPermission, askNotificationPermission } from '../lib/notify';

const LATER_KEY = 'bz-notif-later';
const LATER_DAYS = 3;

const snoozed = () => {
  try { return Date.now() - (Number(localStorage.getItem(LATER_KEY)) || 0) < LATER_DAYS * 864e5; } catch (e) { return false; }
};

// Bottom sheet asking the player to turn on notifications, with a preview of how one looks.
// Shown a few seconds after opening, only while permission hasn't been asked yet; "Not now" hides it for 3 days.
const AllowNotifications = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!snoozed() && (await notificationPermission()) === 'prompt') setOpen(true);
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const later = () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now())); } catch (e) { /* ignore */ }
    setOpen(false);
  };

  const allow = async () => {
    setBusy(true);
    const state = await askNotificationPermission();
    setBusy(false);
    setOpen(false);
    if (state === 'granted') toast.success('Notifications on');
    else later();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center" onClick={later}>
      <div className="w-full sm:max-w-sm bg-white border-t sm:border border-ink sheet-up safe-bottom" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="allow-notif-title">
        {/* preview of a real notification */}
        <div className="bg-[#1c1c1e] px-4 pt-6 pb-5">
          <div className="nz-pop in !mx-0 !max-w-none pointer-events-none" aria-hidden="true">
            <img src="/logo192.png" alt="" className="w-11 h-11 rounded-[11px] shrink-0 object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="font-semibold text-[15px] truncate flex-1">Room is open</p>
                <span className="text-[12px] text-white/55">now</span>
              </div>
              <p className="text-[14px] text-white/85 leading-snug">Room ID and password are up for Sunday Squad Cup. Join now.</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h2 id="allow-notif-title" className="text-[30px]">Don't miss your match</h2>
          <p className="text-[14px] text-muted mt-2">We'll tell you when a new tournament opens and when the room ID and password for your match are posted. Nothing else.</p>
          <div className="grid grid-cols-2 gap-2 mt-5">
            <button onClick={later} className="btn btn-light">Not now</button>
            <button onClick={allow} disabled={busy} className="btn btn-dark">{busy ? 'Asking…' : 'Allow'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllowNotifications;
