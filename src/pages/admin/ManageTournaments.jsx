import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, getDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { PageHead, Avatar, rupees } from '../../components/ui';
import { sendNotification } from '../../lib/notify';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
    <div className="w-full max-w-lg bg-white border border-ink" style={{ boxShadow: '6px 6px 0 #121212' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 h-14 border-b border-ink">
        <h3 className="text-[22px]">{title}</h3>
        <button onClick={onClose} className="text-[13px] underline">Close</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const ManageTournaments = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [roster, setRoster] = useState(null);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'tournaments'), orderBy('createdAt', 'desc')));
        setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'tournaments', t.id));
      setList((p) => p.filter((x) => x.id !== t.id));
      toast('Deleted');
    } catch (e) { toast.error('Delete failed'); }
  };

  const togglePublish = async (t) => {
    const published = t.published === false;
    try {
      await updateDoc(doc(db, 'tournaments', t.id), { published });
      setList((p) => p.map((x) => (x.id === t.id ? { ...x, published } : x)));
      toast(published ? 'Published, players can see it now' : 'Moved back to draft');
      if (published) sendNotification({ title: `New tournament: ${t.name}`, body: `${t.game} · ${t.date} ${t.time} · Prize ${rupees(t.prizePool)} · Entry ${t.entryFee ? rupees(t.entryFee) : 'free'}`, link: `/tournament/${t.id}` }).catch(() => {});
    } catch (e) { toast.error('Update failed'); }
  };

  const setStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'tournaments', id), { status });
      setList((p) => p.map((t) => (t.id === id ? { ...t, status } : t)));
      const t = list.find((x) => x.id === id);
      if (status === 'live' && t && t.published !== false) sendNotification({ title: `LIVE now: ${t.name}`, body: 'Room ID & password are up. Open the match page and join.', link: `/tournament/${id}` }).catch(() => {});
    } catch (e) { toast.error('Update failed'); }
  };

  const saveEdit = async () => {
    const patch = {
      name: edit.name,
      roomId: edit.roomId || '',
      roomPassword: edit.roomPassword || '',
      status: edit.status,
      entryFee: Number(edit.entryFee) || 0,
      prizePool: Number(edit.prizePool) || 0,
    };
    try {
      await updateDoc(doc(db, 'tournaments', edit.id), patch);
      setList((p) => p.map((t) => (t.id === edit.id ? { ...t, ...patch } : t)));
      setEdit(null);
      toast.success('Saved');
    } catch (e) { toast.error('Update failed'); }
  };

  const openRoster = async (t) => {
    setRoster(t);
    setPlayers([]);
    const ids = t.registeredPlayers || [];
    try {
      const snaps = await Promise.all(ids.map((uid) => getDoc(doc(db, 'users', uid))));
      setPlayers(snaps.filter((s) => s.exists()).map((s) => ({ uid: s.id, ...s.data() })));
    } catch (e) { console.error(e); }
  };

  const downloadCSV = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['#', 'Username', 'Email', 'UID'], ...players.map((p, i) => [i + 1, p.username, p.email, p.uid])];
    const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${roster.name}_players.csv`;
    a.click();
  };

  const setE = (k) => (e) => setEdit((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHead kicker="Admin" title="Manage">
        <Link to="/admin/create" className="btn btn-dark">New tournament</Link>
      </PageHead>

      <div className="wrap py-8 overflow-x-auto">
        {loading ? <div className="h-40 skeleton" /> : (
          <table className="w-full min-w-[760px] text-[14px]">
            <thead>
              <tr className="border-b border-ink text-left">
                {['Name', 'Game', 'When', 'In app', 'Status', 'Players', 'Entry / Prize', ''].map((h) => (
                  <th key={h} className="eyebrow font-normal py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className="border-b border-line align-middle">
                  <td className="py-3 font-semibold max-w-[220px] truncate">{t.name}</td>
                  <td className="py-3">{t.game}</td>
                  <td className="py-3 num text-[12px] text-muted">{t.date}<br />{t.time}</td>
                  <td className="py-3">
                    <button onClick={() => togglePublish(t)} className={`tag press ${t.published === false ? 'border-line text-muted' : 'border-win text-win'}`}>
                      {t.published === false ? 'Draft: Publish' : 'Published'}
                    </button>
                  </td>
                  <td className="py-3">
                    <select value={t.status || 'upcoming'} onChange={(e) => setStatus(t.id, e.target.value)} className="field h-8 text-[12px] w-auto">
                      <option value="upcoming">Open</option><option value="live">Live</option><option value="completed">Ended</option>
                    </select>
                  </td>
                  <td className="py-3 num">{t.registeredPlayers?.length || 0}/{t.maxSlots}</td>
                  <td className="py-3 num">{rupees(t.entryFee)} / <b>{rupees(t.prizePool)}</b></td>
                  <td className="py-3">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => setEdit({ ...t })} className="btn btn-light btn-sm">Edit</button>
                      <button onClick={() => openRoster(t)} className="btn btn-light btn-sm">Players</button>
                      <button onClick={() => remove(t)} className="btn btn-light btn-sm hover:!bg-live hover:!border-live">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-muted">No tournaments yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {edit && (
        <Modal title="Edit tournament" onClose={() => setEdit(null)}>
          <div className="space-y-3">
            <div><label className="field-label">Name</label><input className="field" value={edit.name} onChange={setE('name')} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Entry (₹)</label><input type="number" className="field num" value={edit.entryFee} onChange={setE('entryFee')} /></div>
              <div><label className="field-label">Prize pool (₹)</label><input type="number" className="field num" value={edit.prizePool} onChange={setE('prizePool')} /></div>
              <div><label className="field-label">Room ID</label><input className="field num" value={edit.roomId || ''} onChange={setE('roomId')} /></div>
              <div><label className="field-label">Password</label><input className="field num" value={edit.roomPassword || ''} onChange={setE('roomPassword')} /></div>
            </div>
            <div><label className="field-label">Status</label>
              <select className="field" value={edit.status} onChange={setE('status')}>
                <option value="upcoming">Open</option><option value="live">Live</option><option value="completed">Ended</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEdit(null)} className="btn btn-light">Cancel</button>
            <button onClick={saveEdit} className="btn btn-dark">Save</button>
          </div>
        </Modal>
      )}

      {roster && (
        <Modal title={`Players · ${players.length}/${roster.maxSlots}`} onClose={() => setRoster(null)}>
          <div className="max-h-80 overflow-y-auto border-t border-line">
            {players.length === 0 ? <p className="text-muted text-center py-8">No one has joined yet.</p> : players.map((p, i) => (
              <div key={p.uid} className="flex items-center gap-3 py-2.5 border-b border-line">
                <span className="num text-[12px] text-muted w-6">{i + 1}</span>
                <Avatar name={p.username} src={p.photoURL} size={30} />
                <div className="min-w-0">
                  <p className="font-semibold text-[14px] truncate">{p.username}</p>
                  <p className="text-[12px] text-muted truncate">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={downloadCSV} disabled={!players.length} className="btn btn-dark btn-sm">Download CSV</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageTournaments;
