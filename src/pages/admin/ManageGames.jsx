import React, { useEffect, useState } from 'react';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { PageHead } from '../../components/ui';
import { loadGames, invalidateGames } from '../../lib/games';

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ManageGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', fullName: '', color: '#f5b301', imageUrl: '' });
  const [imgEdit, setImgEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    try { setGames(await loadGames()); } catch (e) { toast.error('Could not load games'); }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const add = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { toast.error('Game name is required'); return; }
    const id = slug(name);
    if (games.some((g) => g.id === id)) { toast.error('That game already exists'); return; }
    setSaving(true);
    try {
      await setDoc(doc(collection(db, 'games'), id), {
        name, fullName: form.fullName.trim() || name, color: form.color, imageUrl: form.imageUrl.trim() || null, published: true,
        order: games.length + 1, createdAt: new Date(),
      });
      invalidateGames();
      setForm({ name: '', fullName: '', color: '#f5b301', imageUrl: '' });
      toast.success(`${name} added and published`);
      refresh();
    } catch (err) { toast.error('Could not add game'); }
    setSaving(false);
  };

  const toggle = async (g) => {
    try {
      await updateDoc(doc(db, 'games', g.id), { published: g.published === false });
      invalidateGames();
      setGames((p) => p.map((x) => (x.id === g.id ? { ...x, published: g.published === false } : x)));
      toast(g.published === false ? `${g.name} is live in the app` : `${g.name} hidden from the app`);
    } catch (e) { toast.error('Update failed'); }
  };

  const saveImage = async () => {
    const imageUrl = imgEdit.imageUrl.trim() || null;
    try {
      await updateDoc(doc(db, 'games', imgEdit.id), { imageUrl });
      invalidateGames();
      setGames((p) => p.map((x) => (x.id === imgEdit.id ? { ...x, imageUrl } : x)));
      setImgEdit(null);
      toast.success('Image saved');
    } catch (e) { toast.error('Could not save'); }
  };

  const remove = async (g) => {
    if (!window.confirm(`Delete ${g.name}? Tournaments using it are not deleted.`)) return;
    try {
      await deleteDoc(doc(db, 'games', g.id));
      invalidateGames();
      setGames((p) => p.filter((x) => x.id !== g.id));
      toast('Deleted');
    } catch (e) { toast.error('Delete failed'); }
  };

  return (
    <div>
      <PageHead kicker="Admin" title="Games" />

      <form onSubmit={add} className="wrap py-6 border-b border-line grid sm:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
        <div><label className="field-label">Short name (shown on chips)</label>
          <input className="field" placeholder="e.g. Clash Royale" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="field-label">Full name</label>
          <input className="field" placeholder="optional" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><label className="field-label">Logo image link (optional)</label>
          <input className="field" placeholder="https://.../logo.png" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
        <div><label className="field-label">Colour</label>
          <input type="color" className="field w-16 p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        <button className="btn btn-dark" disabled={saving}>{saving ? 'Adding…' : 'Add & publish'}</button>
      </form>

      <div className="wrap py-6">
        {loading ? <div className="h-40 skeleton" /> : (
          <ul className="border-t border-ink stagger">
            {games.map((g) => {
              const live = g.published !== false;
              return (
                <li key={g.id} className="flex items-center gap-3 py-3 border-b border-line">
                  <span className="w-10 h-10 shrink-0 grid place-items-center text-white font-black text-[13px] overflow-hidden" style={{ background: g.color || '#121212' }}>
                    {g.imageUrl ? <img src={g.imageUrl} alt="" className="w-full h-full object-cover" /> : g.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{g.name}</p>
                    <p className="text-[12px] text-muted truncate">{g.fullName || g.name}</p>
                  </div>
                  <span className={`tag ${live ? 'border-win text-win' : 'border-line text-muted'}`}>{live ? 'Published' : 'Hidden'}</span>
                  <button onClick={() => setImgEdit({ id: g.id, name: g.name, imageUrl: g.imageUrl || '' })} className="btn btn-light btn-sm">Image</button>
                  <button onClick={() => toggle(g)} className="btn btn-light btn-sm">{live ? 'Hide' : 'Publish'}</button>
                  <button onClick={() => remove(g)} className="btn btn-light btn-sm hover:!bg-live hover:!border-live">Delete</button>
                </li>
              );
            })}
          </ul>
        )}
        {imgEdit && (
          <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4" onClick={() => setImgEdit(null)}>
            <div className="w-full max-w-md bg-white border border-ink p-5" style={{ boxShadow: '6px 6px 0 #121212' }} onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[22px] mb-3">{imgEdit.name} image</h3>
              <input className="field" autoFocus placeholder="https://.../logo.png" value={imgEdit.imageUrl} onChange={(e) => setImgEdit({ ...imgEdit, imageUrl: e.target.value })} />
              {imgEdit.imageUrl && <img src={imgEdit.imageUrl} alt="" className="mt-3 w-24 h-24 object-cover border border-line" />}
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setImgEdit(null)} className="btn btn-light">Cancel</button>
                <button onClick={saveImage} className="btn btn-dark">Save</button>
              </div>
            </div>
          </div>
        )}
        <p className="text-[13px] text-muted mt-4">Published games appear as filters on Home and Matches, and in the game list when you create a tournament.</p>
      </div>
    </div>
  );
};

export default ManageGames;
