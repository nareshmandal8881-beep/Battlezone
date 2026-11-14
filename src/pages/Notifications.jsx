import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiChevronRight } from 'react-icons/fi';
import { PageHead, Empty } from '../components/ui';
import { useNotifications, askNotificationPermission } from '../lib/notify';

const when = (n) => {
  const d = n.createdAt?.toDate?.();
  if (!d) return 'just now';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const Notifications = () => {
  const { items, seen, markAllSeen } = useNotifications();

  useEffect(() => {
    askNotificationPermission();
    const t = setTimeout(markAllSeen, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pb-10">
      <PageHead kicker="Updates" title="Notifications" />
      {items.length === 0 ? (
        <div className="wrap py-8"><Empty title="No notifications yet">New tournaments and match updates will show up here.</Empty></div>
      ) : (
        <ul className="stagger">
          {items.map((n) => {
            const isNew = (n.createdAt?.toMillis?.() ?? 0) > seen;
            const inner = (
              <>
                <span className={`w-10 h-10 shrink-0 grid place-items-center text-[18px] ${isNew ? 'bg-[#f5b301] text-black' : 'bg-[#f1efea] text-muted'}`}><FiBell /></span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[15px] truncate">{n.title}</span>
                    {isNew && <span className="w-2 h-2 rounded-full bg-live shrink-0" />}
                  </span>
                  {n.body && <span className="block text-[13px] text-muted mt-0.5">{n.body}</span>}
                  <span className="block font-mono text-[11px] text-muted mt-1">{when(n)}</span>
                </span>
                {n.link && <FiChevronRight className="text-muted self-center" />}
              </>
            );
            const cls = `flex gap-3 px-4 sm:px-8 py-4 border-b border-line ${isNew ? 'bg-[#fffaf0]' : ''}`;
            return <li key={n.id}>{n.link ? <Link to={n.link} className={`${cls} press`}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
          })}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
