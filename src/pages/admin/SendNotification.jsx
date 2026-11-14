import React, { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { PageHead } from '../../components/ui';
import { sendNotification, useNotifications } from '../../lib/notify';

const TEMPLATES = [
  { title: 'Room is live!', body: 'Room ID and password are up. Open the match page and join now.' },
  { title: 'New tournament added', body: 'Slots are limited — book yours before they fill up.' },
  { title: 'Results are out', body: 'Check the leaderboard to see this week’s winners.' },
];

const SendNotification = () => {
  const { items } = useNotifications();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sending, setSending] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSending(true);
    try {
      await sendNotification({ title: title.trim(), body: body.trim(), link: link.trim() });
      toast.success('Sent to everyone');
      setTitle(''); setBody(''); setLink('');
    } catch (err) { toast.error('Could not send'); }
    setSending(false);
  };

  const remove = async (n) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return;
    try { await deleteDoc(doc(db, 'notifications', n.id)); toast('Deleted'); } catch (e) { toast.error('Delete failed'); }
  };

  return (
    <div className="pb-10">
      <PageHead kicker="Admin" title="Send notification" />
      <form onSubmit={send} className="wrap py-6 space-y-4 max-w-2xl">
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button key={t.title} type="button" onClick={() => { setTitle(t.title); setBody(t.body); }} className="btn btn-light btn-sm">{t.title}</button>
          ))}
        </div>
        <div><label className="field-label">Title</label><input className="field" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. BGMI Scrims start in 30 min" /></div>
        <div><label className="field-label">Message</label><textarea rows={3} className="field" maxLength={180} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Short message players will read" /></div>
        <div><label className="field-label">Open this page when tapped (optional)</label><input className="field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/tournaments  or  /ludo" /></div>
        <button className="btn btn-dark" disabled={sending}>{sending ? 'Sending…' : 'Send to all players'}</button>
        <p className="text-[12px] text-muted">Players see it in the 🔔 bell instantly. Android app users also get a phone notification while the app is open or in the background.</p>
      </form>

      <div className="wrap">
        <p className="eyebrow mb-2">Sent</p>
        <ul className="border-t border-ink">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-3 border-b border-line">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="text-[13px] text-muted">{n.body}</p>}
                {n.link && <p className="font-mono text-[11px] text-muted">→ {n.link}</p>}
              </div>
              <button onClick={() => remove(n)} className="btn btn-light btn-sm">Delete</button>
            </li>
          ))}
          {items.length === 0 && <li className="py-6 text-muted text-[14px]">Nothing sent yet.</li>}
        </ul>
      </div>
    </div>
  );
};

export default SendNotification;
