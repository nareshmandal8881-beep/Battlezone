import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, getDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { PageHead, Avatar, rupees } from '../../components/ui';
import { sendNotification } from '../../lib/notify';
import ModeMapPicker from '../../components/ModeMapPicker';
import { normalise, perSide, randomTeams } from '../../lib/gameModes';
import { useGames } from '../../lib/games';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={onClose}>
    <div className="w-full max-w-lg bg-white border border-ink" style={{ boxShadow: '6px 6px 0 #121212' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-5 h-14 border-b border-ink">
        <h3 className="text-[22px]">{title}</h3>
        <button onClick={onClose} className="text-[13px] underline">Close</button>
      </div>
      <div className="p-5 max-h-[78vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const ManageTournaments = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [roster, setRoster] = useState(null);
  const [players, setPlayers] = useState([]);
  const gameNames = useGames({ all: true }).map((x) => x.name);

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
      prize1: Number(edit.prize1) || 0,
      prize2: Number(edit.prize2) || 0,
      prize3: Number(edit.prize3) || 0,
      killPrize: Number(edit.killPrize) || 0,
      game: edit.game,
      mode: edit.mode || '',
      map: edit.map || '',
      teamSize: edit.teamSize || '',
      maxSlots: Number(edit.maxSlots) || 0,
      bannerUrl: (edit.bannerUrl || '').trim() || null,
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

  const shuffleTeams = async () => {
    const size = perSide(roster.teamSize);
    if (!size || players.length < 2) return;
    if (roster.teams && !window.confirm('Teams already made. Shuffle again?')) return;
    const pick = randomTeams(players.map((p) => ({ uid: p.uid, name: p.username || p.email || 'Player' })), size);
    try {
      await updateDoc(doc(db, 'tournaments', roster.id), { teams: pick });
      setRoster((r) => ({ ...r, teams: pick }));
      setList((l) => l.map((t) => (t.id === roster.id ? { ...t, teams: pick } : t)));
      toast.success('Random teams ready');
    } catch (e) { toast.error('Could not save teams'); }
  };

  const teamOf = (uid) => {
    if (roster?.teams?.A?.some((x) => x.uid === uid)) return 'A';
    if (roster?.teams?.B?.some((x) => x.uid === uid)) return 'B';
    return null;
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
                      <button onClick={() => setEdit(normalise({ ...t }))} className="btn btn-light btn-sm">Edit</button>
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
            <ModeMapPicker value={edit} games={gameNames} onChange={(v) => setEdit((p) => ({ ...p, ...v }))} />
            <div>
              <label className="field-label">Banner image link (URL)</label>
              <input className="field" placeholder="https://.../banner.jpg" value={edit.bannerUrl || ''} onChange={setE('bannerUrl')} />
              {edit.bannerUrl && (
                <div className="mt-2 aspect-[16/6] border border-line bg-[#f1efea] overflow-hidden">
                  <img src={edit.bannerUrl} alt="Banner preview" className="w-full h-full object-cover" onLoad={(e) => { e.currentTarget.style.opacity = 1; }} onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
                </div>
              )}
              <p className="text-[11px] text-muted mt-1">Right-click any image online → "Copy image address" → paste here. Leave empty to remove.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Entry (₹)</label><input type="number" className="field num" value={edit.entryFee} onChange={setE('entryFee')} /></div>
              <div><label className="field-label">Prize pool (₹)</label><input type="number" className="field num" value={edit.prizePool} onChange={setE('prizePool')} /></div>
            </div>

            {(() => {
              const n = (v) => Number(v) || 0;
              const split = n(edit.prize1) + n(edit.prize2) + n(edit.prize3);
              const over = split > n(edit.prizePool);
              const autoSplit = () => {
                const pool = n(edit.prizePool);
                const p1 = Math.round(pool * 0.5);
                const p2 = Math.round(pool * 0.3);
                setEdit((p) => ({ ...p, prize1: p1, prize2: p2, prize3: pool - p1 - p2 }));
              };
              return (
                <div className="border border-line p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-[14px]">Prize split</p>
                    <button type="button" onClick={autoSplit} className="btn btn-light btn-sm">Auto split 50/30/20</button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[['prize1', '1st'], ['prize2', '2nd'], ['prize3', '3rd'], ['killPrize', 'Per kill']].map(([k, label]) => (
                      <div key={k}>
                        <label className="field-label !text-[12px]">{label} (₹)</label>
                        <input type="number" min="0" className="field num !h-10 !px-2" value={edit[k] ?? ''} onChange={setE(k)} />
                      </div>
                    ))}
                  </div>
                  <p className={`text-[12px] mt-2 num ${over ? 'text-live font-semibold' : 'text-muted'}`}>
                    1st + 2nd + 3rd = ₹{split} of ₹{n(edit.prizePool)} pool{over ? ' — more than the pool!' : ''}
                  </p>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-3">
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
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[14px] truncate">{p.username}</p>
                  <p className="text-[12px] text-muted truncate">{p.email}</p>
                </div>
                {teamOf(p.uid) && <span className={`tag ${teamOf(p.uid) === 'A' ? 'border-accent text-accent' : 'border-ink'}`}>Team {teamOf(p.uid)}</span>}
                {roster.teams && !teamOf(p.uid) && <span className="tag border-line text-muted">Extra</span>}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {perSide(roster.teamSize) && (
              <button onClick={shuffleTeams} disabled={players.length < 2} className="btn btn-light btn-sm">
                {roster.teams ? 'Shuffle again' : `Random teams (${roster.teamSize})`}
              </button>
            )}
            <button onClick={downloadCSV} disabled={!players.length} className="btn btn-dark btn-sm">Download CSV</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ManageTournaments;
