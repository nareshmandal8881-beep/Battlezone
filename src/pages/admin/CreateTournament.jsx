import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { db, storage } from '../../firebase/config';
import { PageHead } from '../../components/ui';
import { useGames } from '../../lib/games';

const MODES = ['Squad', 'Duo', 'Solo', 'TDM', 'Clash Squad'];
const SLOT_OPTIONS = [25, 50, 100, 200];

const Section = ({ n, title, children }) => (
  <section className="grid md:grid-cols-[220px_1fr] gap-4 md:gap-8 py-8 border-b border-line">
    <div>
      <span className="num text-[13px] text-accent font-bold">0{n}</span>
      <h2 className="text-[24px] mt-1">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({ label, children }) => (
  <div><label className="field-label">{label}</label>{children}</div>
);

const CreateTournament = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const GAMES = useGames().map((x) => x.name);
  const [bannerLink, setBannerLink] = useState('');
  const publishRef = React.useRef(true);
  const [bannerFile, setBannerFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [f, setF] = useState({
    name: '', game: 'BGMI', mode: 'Squad', map: 'Erangel', date: '', time: '',
    entryFee: 50, prizePool: 1000, prize1: 500, prize2: 300, prize3: 150, killPrize: 10,
    maxSlots: 100, status: 'upcoming', roomId: '', roomPassword: '',
    rules: `1. Register before the match starts.\n2. Play only from the account you registered with.\n3. No hacks or teaming.\n4. Room ID and password are shared 10 minutes before start.\n5. Be in the room 5 minutes before start time.\n6. The admin's decision is final in disputes.`,
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const onBanner = (e) => {
    const file = e.target.files[0];
    if (file) { setBannerFile(file); setPreview(URL.createObjectURL(file)); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.date || !f.time) { toast.error('Name, date and time are required'); return; }
    setSaving(true);
    try {
      let bannerUrl = bannerLink.trim() || null;
      if (bannerFile && !bannerUrl) {
        try {
          const r = ref(storage, `banners/${Date.now()}_${bannerFile.name}`);
          await uploadBytes(r, bannerFile);
          bannerUrl = await getDownloadURL(r);
        } catch (upErr) {
          toast('Banner upload not available, saved without image. Paste an image link instead.');
        }
      }
      const nums = ['entryFee', 'prizePool', 'prize1', 'prize2', 'prize3', 'killPrize', 'maxSlots'];
      const data = { ...f, name: f.name.trim(), bannerUrl, published: publishRef.current, registeredPlayers: [], createdAt: serverTimestamp() };
      nums.forEach((k) => { data[k] = Number(f[k]) || 0; });
      await addDoc(collection(db, 'tournaments'), data);
      toast.success(publishRef.current ? 'Published, now live in the app' : 'Saved as draft');
      navigate('/admin/manage');
    } catch (err) {
      console.error(err);
      toast.error('Could not create tournament');
    }
    setSaving(false);
  };

  return (
    <div>
      <PageHead kicker="Admin" title="New tournament" />
      <form onSubmit={submit} className="wrap">
        <Section n={1} title="Basics">
          <Field label="Name"><input className="field" placeholder="Sunday Squad Cup #12" value={f.name} onChange={set('name')} /></Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Game"><select className="field" value={f.game} onChange={set('game')}>{GAMES.map((g) => <option key={g}>{g}</option>)}</select></Field>
            <Field label="Mode"><select className="field" value={f.mode} onChange={set('mode')}>{MODES.map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Map"><input className="field" value={f.map} onChange={set('map')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date"><input type="date" className="field" value={f.date} onChange={set('date')} /></Field>
            <Field label="Start time"><input type="time" className="field" value={f.time} onChange={set('time')} /></Field>
          </div>
          <Field label="Slots">
            <div className="flex border border-ink w-fit">
              {SLOT_OPTIONS.map((s) => (
                <button key={s} type="button" onClick={() => setF((p) => ({ ...p, maxSlots: s }))}
                  className={`h-10 px-4 num text-[14px] border-r border-ink last:border-r-0 ${Number(f.maxSlots) === s ? 'bg-ink text-white' : 'bg-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Status">
            <select className="field" value={f.status} onChange={set('status')}>
              <option value="upcoming">Open</option><option value="live">Live</option><option value="completed">Ended</option>
            </select>
          </Field>
        </Section>

        <Section n={2} title="Money">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Entry fee (₹) — 0 for free"><input type="number" min="0" className="field num" value={f.entryFee} onChange={set('entryFee')} /></Field>
            <Field label="Prize pool (₹)"><input type="number" min="0" className="field num" value={f.prizePool} onChange={set('prizePool')} /></Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="1st"><input type="number" min="0" className="field num" value={f.prize1} onChange={set('prize1')} /></Field>
            <Field label="2nd"><input type="number" min="0" className="field num" value={f.prize2} onChange={set('prize2')} /></Field>
            <Field label="3rd"><input type="number" min="0" className="field num" value={f.prize3} onChange={set('prize3')} /></Field>
            <Field label="Per kill"><input type="number" min="0" className="field num" value={f.killPrize} onChange={set('killPrize')} /></Field>
          </div>
        </Section>

        <Section n={3} title="Banner">
          <label className="block cursor-pointer border border-dashed border-line hover:border-ink aspect-[16/6] bg-[#faf9f6] overflow-hidden">
            {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : (
              <span className="h-full grid place-items-center text-[14px] text-muted">Click to upload (optional, JPG/PNG)</span>
            )}
            <input type="file" accept="image/*" onChange={onBanner} className="hidden" />
          </label>
          <Field label="Or paste an image link (recommended)"><input className="field" placeholder="https://.../banner.jpg" value={bannerLink} onChange={(e) => { setBannerLink(e.target.value); setPreview(e.target.value || null); }} /></Field>
        </Section>

        <Section n={4} title="Room">
          <p className="text-[13px] text-muted -mt-1">Players only see these after joining and when the match is Live.</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room ID"><input className="field num" value={f.roomId} onChange={set('roomId')} /></Field>
            <Field label="Password"><input className="field num" value={f.roomPassword} onChange={set('roomPassword')} /></Field>
          </div>
        </Section>

        <Section n={5} title="Rules">
          <textarea rows={8} className="field" value={f.rules} onChange={set('rules')} />
        </Section>

        <div className="py-8 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-light">Cancel</button>
          <button type="submit" disabled={saving} onClick={() => { publishRef.current = false; }} className="btn btn-light">Save as draft</button>
          <button type="submit" disabled={saving} onClick={() => { publishRef.current = true; }} className="btn btn-dark">{saving ? 'Saving…' : 'Publish now'}</button>
        </div>
      </form>
    </div>
  );
};

export default CreateTournament;
