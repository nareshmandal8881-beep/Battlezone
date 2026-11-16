import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';

// Phone-style notification card: app logo on the left, title + message, "now" on the right.
// Slides down from the top; drag it up to dismiss, tap to open.
const NotifyPopup = ({ t, n, onOpen }) => {
  const startY = useRef(null);
  const [dy, setDy] = useState(0);

  const down = (e) => { startY.current = e.clientY; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    if (startY.current == null) return;
    setDy(Math.min(0, e.clientY - startY.current)); // only upward
  };
  const up = () => {
    if (startY.current == null) return;
    startY.current = null;
    if (dy < -40) toast.dismiss(t.id);
    else if (dy > -6) onOpen();
    setDy(0);
  };

  return (
    <div
      role="alert"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { startY.current = null; setDy(0); }}
      className={`nz-pop ${t.visible ? 'in' : 'out'}`}
      style={dy ? { transform: `translateY(${dy}px)`, opacity: 1 + dy / 160, transition: 'none' } : undefined}>
      <img src="/logo192.png" alt="" className="w-11 h-11 rounded-[11px] shrink-0 object-cover" draggable="false" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="font-semibold text-[15px] leading-snug truncate flex-1">{n.title}</p>
          <span className="text-[12px] text-white/55 shrink-0">now</span>
        </div>
        {n.body && <p className="text-[14px] leading-snug text-white/85 line-clamp-2">{n.body}</p>}
      </div>
    </div>
  );
};

export default NotifyPopup;
