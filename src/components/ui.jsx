import React from 'react';
import { useAppLayout } from '../lib/layout';

export const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const StatusTag = ({ status = 'upcoming' }) => {
  if (status === 'live') {
    return (
      <span className="tag border-live text-live bg-white">
        <span className="w-1.5 h-1.5 rounded-full bg-live ping text-live" /> Live
      </span>
    );
  }
  if (status === 'completed') {
    return <span className="tag border-line text-muted bg-white">Ended</span>;
  }
  return <span className="tag border-ink text-ink bg-white">Open</span>;
};

// In the Android app the top bar already shows the title, so only render the controls.
export const PageHead = ({ kicker, title, children }) =>
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useAppLayout() ? (
    children ? <div className="px-4 pt-3 pb-3 border-b border-line [&>*]:w-full">{children}</div> : null
  ) : (
  <header className="wrap pt-10 pb-8 border-b border-ink">
    {kicker && <p className="eyebrow mb-3">{kicker}</p>}
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <h1 className="text-[44px] sm:text-[56px]">{title}</h1>
      {children}
    </div>
  </header>
);

export const Avatar = ({ name, src, size = 36 }) => (
  <div
    className="shrink-0 overflow-hidden border border-ink bg-[#f1efea] grid place-items-center font-bold"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
  >
    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : (name || '?')[0].toUpperCase()}
  </div>
);

export const Empty = ({ title, children }) => (
  <div className="border border-dashed border-line py-14 px-6 text-center">
    <p className="font-semibold">{title}</p>
    {children && <div className="text-muted text-sm mt-1">{children}</div>}
  </div>
);
